import os
import sys
import json
import time
import traceback
import torch
import inspect
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset, random_split
import torchvision
import torchvision.transforms as transforms
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import pickle
import base64
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, r2_score, mean_squared_error, mean_absolute_error, accuracy_score
import sys
sys.stdout.reconfigure(line_buffering=True)  # ensures flush after every print
from PIL import Image

# === Electron IPC ===
def send_log(message): print(json.dumps({"type": "log", "message": message})); sys.stdout.flush()
def send_progress(percent): print(json.dumps({"type": "progress", "message": str(percent)})); sys.stdout.flush()
def send_complete(): print(json.dumps({"type": "complete", "message": "done"})); sys.stdout.flush()
def send_graph(path): print(json.dumps({"type": "graph", "path": path})); sys.stdout.flush()


def safe_loader(path):
    try:
        return Image.open(path).convert("RGB")
    except Exception as e:
        send_log(f"Skipping bad image: {path} ({e})")
        return Image.new("RGB", (32, 32), (0, 0, 0))  # dummy black image

model_class_code = ""
# === Model Definitions ===
MLP_CODE = """
class MLP(nn.Module):
    def __init__(self, input_size, layer_size, num_layers, output_size):
        super().__init__()
        layers = [nn.Linear(input_size, layer_size), nn.ReLU()]
        for _ in range(num_layers - 1):
            layers += [nn.Linear(layer_size, layer_size), nn.ReLU()]
        layers.append(nn.Linear(layer_size, output_size))
        self.net = nn.Sequential(*layers)
    def forward(self, x): return self.net(x)
"""

CNN_CODE = """
class CNN(nn.Module):
    def __init__(self, input_channels, output_size, conv_configs):
        super(CNN, self).__init__()
        layers = []
        in_channels = input_channels

        for config in conv_configs:
            layers.append(nn.Conv2d(
                in_channels,
                config["out_channels"],
                kernel_size=config["kernel_size"],
                padding=config["padding"]
            ))
            layers.append(nn.ReLU())
            in_channels = config["out_channels"]

        self.conv = nn.Sequential(*layers)
        self.flatten = nn.Flatten()
        self.fc = nn.Linear(in_channels, output_size)  # In_channels from last Conv layer

    def forward(self, x):
        x = self.conv(x)                        # [B, C, H, W]
        x = torch.mean(x, dim=[2, 3])           # [B, C]
        x = self.fc(x)                          # [B, output_size]
        return x
"""
RNN_CODE = """
class RNN(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super().__init__()
        self.rnn = nn.RNN(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    def forward(self, x):
        # Ensure input is 3D: [batch, seq_len, features]
        if x.dim() == 2:
            x = x.unsqueeze(1)  # [batch, 1, features]
        elif x.dim() != 3:
            raise ValueError(f"Expected 2D or 3D input, got shape {x.shape}")

        out, _ = self.rnn(x)
        return self.fc(out[:, -1, :])  # use last time step
"""
LSTM_CODE = """
class LSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    def forward(self, x):
        # Ensure input is 3D: [batch, seq_len, features]
        if x.dim() == 2:
            x = x.unsqueeze(1)  # [batch, 1, features]
        elif x.dim() != 3:
            raise ValueError(f"Expected 2D or 3D input, got shape {x.shape}")

        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])  # use last time step
"""

def main():
    scaler = None
    try:
        config = json.loads(sys.stdin.read())
        send_log("Parsed config.")

        # === Basic Extraction and Checks ===
        required_keys = ["inputType", "datasetPath", "inputType", "modelStruct", "modelType", "saveLocation",
                         "epochs", "batchSize", "padding", "kernelSize", "layerSize", "numLayers"]
        for key in required_keys:
            if key not in config:
                raise ValueError(f"Missing required config key: {key}")

        input_type = config["inputType"]
        model_type = config["modelType"]
        struct = config["modelStruct"]
        path = config["datasetPath"]
        save_dir = config["saveLocation"]
        os.makedirs(save_dir, exist_ok=True)


        # === Dataset Load and Preprocessing ===
        if input_type == "csv":
            df = pd.read_csv(path)
            input_cols = config["inputColumns"]
            #print(input_cols)
            target_col = config["targetColumn"]
            #print(target_col)
            #print(df.columns)

            if not all(col in df.columns for col in input_cols + [target_col]):
                raise ValueError("Invalid input or target column names in CSV.")

            X = df[input_cols].values
            y = df[target_col].values
            if config["preprocessing"].get("normalize"):
                scaler = StandardScaler()
                X = scaler.fit_transform(X)

            if model_type == "classification":
                y = LabelEncoder().fit_transform(y)
                output_size = len(np.unique(y))
                unique_classes = [int(c) for c in np.unique(y)]
                
                # Add classes for test.py
                config["classes"] = unique_classes
            else:
                output_size = 1

            X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
            X_train, X_val = map(lambda x: torch.tensor(x, dtype=torch.float32), [X_train, X_val])
            y_train = torch.tensor(y_train, dtype=torch.long if model_type == "classification" else torch.float32)
            y_val = torch.tensor(y_val, dtype=torch.long if model_type == "classification" else torch.float32)

            if struct.lower() == "rf":
                model = (RandomForestClassifier if model_type == "classification" else RandomForestRegressor)(n_estimators=100)
                model.fit(X_train.numpy(), y_train.numpy())
                send_log("Random Forest trained.")
                preds = model.predict(X_val.numpy())
                _save_eval_plots(y_val.numpy(), preds, model_type, save_dir)
                send_complete()
                return

            train_ds = TensorDataset(X_train, y_train)
            train_loader = DataLoader(train_ds, batch_size=int(config["batchSize"]), shuffle=True)

        elif input_type == "images":
            transform = transforms.Compose([transforms.Resize((32, 32)), transforms.ToTensor()])
            dataset = torchvision.datasets.ImageFolder(path, transform=transform, loader=safe_loader)
            num_classes = len(dataset.classes)
            train_len = int(0.8 * len(dataset))
            train_ds, val_ds = random_split(dataset, [train_len, len(dataset) - train_len])
            train_loader = DataLoader(train_ds, batch_size=int(config["batchSize"]), shuffle=True)
            val_loader = DataLoader(val_ds, batch_size=int(config["batchSize"]))
            output_size = num_classes

            if model_type == "classification":
                config["classes"] = list(range(output_size))
        else:
            raise ValueError(f"Unsupported inputType: {input_type}")

        # === Build Model ===
        layer_size = int(config["layerSize"])
        num_layers = int(config["numLayers"])
        kernel_size = int(config["kernelSize"])
        padding = int(config["padding"])

        if struct == "mlp" or struct == "fnn":
            exec(MLP_CODE, globals())
            MLP_class = globals()["MLP"]
            model = MLP_class(X_train.shape[1], layer_size, num_layers, output_size)
            model_class_code = MLP_CODE
        elif struct == "cnn":
            conv_configs = [
                {
                    "out_channels": layer_size,
                    "kernel_size": kernel_size,
                    "padding": padding
                }
                for _ in range(num_layers)
            ]
            exec(CNN_CODE, globals())
            CNN_class = globals()["CNN"]
            model = CNN_class(3, output_size, conv_configs)
            model_class_code = CNN_CODE
        elif struct == "rnn":
            exec(RNN_CODE, globals())
            RNN_class = globals()["RNN"]
            model = RNN_class(X_train.shape[1], layer_size, num_layers, output_size)
            model_class_code = RNN_CODE
        elif struct == "lstm":
            exec(LSTM_CODE, globals())
            LSTM_class = globals()["LSTM"]
            model = LSTM_class(X_train.shape[1], layer_size, num_layers, output_size)
            model_class_code = LSTM_CODE
        else:
            raise ValueError(f"Unsupported modelStruct: {struct}")

        # === Loss + Optimizer ===
        criterion = nn.CrossEntropyLoss() if model_type == "classification" else nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters())
        model.train()

        send_log("Training started.")
        losses = []
        for epoch in range(int(config["epochs"])):
            total_loss = 0
            for batch in train_loader:
                x, y = batch
                optimizer.zero_grad()
                output = model(x)
                if model_type == "regression": output = output.squeeze()
                loss = criterion(output, y)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            avg_loss = total_loss / len(train_loader)
            losses.append(avg_loss)
            send_log(f"Epoch {epoch+1}: Loss = {avg_loss:.4f}")
            send_progress(int((epoch+1)/int(config["epochs"])*100))
        # === Evaluation ===
        try:
            config["model_class_code"] = model_class_code
        except Exception as e:
            send_log(f"Failed to get model class source: {e}")
            config["model_class_code"] = "Could not retrieve."  
        model.eval()
        if input_type == "csv":
            preds = model(X_val)
            if model_type == "classification":
                preds = preds.argmax(dim=1)
                _save_eval_plots(y_val.numpy(), preds.numpy(), model_type, save_dir)
                accuracy = accuracy_score(y_val.numpy(), preds.numpy())
                send_log(f"Validation Accuracy: {accuracy:.4f}")
                config["evaluation_metric"] = {
                    "type": "accuracy",
                    "value": accuracy
                }
            else:
                preds_np = preds.detach().numpy().flatten()
                _save_eval_plots(y_val.numpy(), preds_np, model_type, save_dir)
                mae = mean_absolute_error(y_val.numpy(), preds_np)
                send_log(f"Validation MAE: {mae:.4f}")
                r2 = r2_score(y_val.numpy(), preds_np)
                send_log(f"Validation R^2: {r2:.4f}")
                config["evaluation_metric"] = {
                    "type": "mae",
                    "value": mae,
                    "r^2": r2
                }
        else:
            all_preds, all_labels = [], []
            for x, y in val_loader:
                out = model(x)
                pred = out.argmax(1)
                all_preds.extend(pred.numpy())
                all_labels.extend(y.numpy())
            _save_eval_plots(np.array(all_labels), np.array(all_preds), "classification", save_dir)
            accuracy = accuracy_score(np.array(all_labels), np.array(all_preds))
            send_log(f"Validation Accuracy: {accuracy:.4f}")
            config["evaluation_metric"] = {
                "type": "accuracy",
                "value": accuracy
            }

        # === Save ===
        torch.save(model.state_dict(), os.path.join(save_dir, "model.pth"))
        if(scaler):
            with open(os.path.join(save_dir, "scaler.pkl"), "wb") as f:
                pickle.dump(scaler, f)
        plt.figure()
        plt.plot(losses)
        plt.title("Loss Curve")
        plt.xlabel("Epoch")
        plt.ylabel("Loss")
        loss_path = os.path.join(save_dir, "loss_curve.png")
        plt.savefig(loss_path)
        send_graph(loss_path)
        # === Save config ===
        send_log("Sending graphs: ")
        with open(os.path.join(save_dir, "config.json"), "w") as f:
            json.dump(config, f, indent=2)
        with open(os.path.join(save_dir, "loss_curve.png"), "rb") as f:
            encoded = "data:image/png;base64," + base64.b64encode(f.read()).decode('utf-8')
            send_log(
                f"name: \"loss\" data: \"{encoded}\""
            )
        with open(os.path.join(save_dir, "evaluation.png"), "rb") as f:
            encoded = "data:image/png;base64," + base64.b64encode(f.read()).decode('utf-8')
            send_log(
                f"name: \"evaluation\" data: \"{encoded}\""
            )
        send_complete()


    except Exception as e:
        error_trace = traceback.format_exc()
        send_log(f"[ERROR] {str(e)}\n{error_trace}")
        sys.exit(1)

def _save_eval_plots(true, pred, task, out_dir):
    if task == "classification":
        cm = confusion_matrix(true, pred)
        disp = ConfusionMatrixDisplay(confusion_matrix=cm)
        fig, ax = plt.subplots()
        disp.plot(ax=ax)
        cm_path = os.path.join(out_dir, "evaluation.png")
        plt.savefig(cm_path)
        send_graph(cm_path)
    else:
        scatter_path = os.path.join(out_dir, "evaluation.png")
        plt.figure()
        plt.scatter(true, pred, alpha=0.5)
        plt.xlabel("True")
        plt.ylabel("Predicted")
        plt.title(f"R²: {r2_score(true, pred):.2f}")
        plt.savefig(scatter_path)
        send_graph(scatter_path)


if __name__ == "__main__":
    main()
