import sys
import json
import torch
import numpy as np
import os
from PIL import Image
import torchvision.transforms as T
import torch.nn as nn
import torch.nn.functional as F
import pickle

# --- Config loader ---
def load_config(model_path):
    config_path = os.path.join(model_path, "config.json")
    with open(config_path) as f:
        return json.load(f)

# --- Dynamic model loader ---
def load_model(model_path, config):
    model_code = config.get("model_class_code")
    if not model_code:
        raise ValueError("No model_class_code found in config.json")

    exec_globals = {"torch": torch, "nn": nn, "F": F, "np": np}
    exec(model_code, exec_globals)

    struct = config["modelStruct"].lower()
    ModelClass = exec_globals.get(config["modelStruct"].upper())
    if ModelClass is None:
        raise ValueError(f"Model class '{config['modelStruct']}' not defined in model_class_code.")

    output_size = 1 if config["modelType"] == "regression" else len(config.get("classes", [0, 1]))

    if struct in ["mlp", "fnn", "rnn", "lstm"]:
        input_size = len(config.get("inputColumns", [])) if config["inputType"] == "csv" else 3*64*64
        model = ModelClass(input_size, config.get("layerSize", 64), config.get("numLayers", 2), output_size)
    elif struct == "cnn":
        conv_configs = [
            {
                "out_channels": config.get("layerSize", 64),
                "kernel_size": config.get("kernelSize", 3),
                "padding": config.get("padding", 1),
            }
            for _ in range(config.get("numLayers", 2))
        ]
        model = ModelClass(input_channels=3, output_size=output_size, conv_configs=conv_configs)
    else:
        raise ValueError(f"Unsupported modelStruct: {struct}")

    model.load_state_dict(torch.load(os.path.join(model_path, "model.pth"), map_location="cpu"))
    model.eval()
    return model

# --- Preprocessing ---
def preprocess_csv(config, input_dict, model_path):
    data = np.array([[float(input_dict[col]) for col in config["inputColumns"]]])
    scaler_path = os.path.join(model_path, "scaler.pkl")
    if os.path.exists(scaler_path):
        with open(scaler_path, "rb") as f:
            scaler = pickle.load(f)
        data = scaler.transform(data)
    return torch.tensor(data, dtype=torch.float32)

def preprocess_image(image_path, model_type="cnn", img_size=(64,64)):
    if not os.path.isfile(image_path):
        raise ValueError(f"Invalid image path: {image_path}")
    transform = T.Compose([T.Resize(img_size), T.ToTensor()])
    image = Image.open(image_path).convert("RGB")
    tensor = transform(image).unsqueeze(0)
    if model_type.lower() in ["mlp", "fnn", "rnn", "lstm"]:
        tensor = tensor.view(1, -1)  # flatten for non-CNN models
    return tensor

# --- Main ---
def main():
    raw = sys.stdin.read()
    payload = json.loads(raw)
    model_path = payload["modelPath"]
    inputs = payload.get("inputs")  # Can be a single file path (string) or list of paths

    config = load_config(model_path)
    model = load_model(model_path, config)
    struct = config["modelStruct"].lower()

    if config["inputType"] == "csv":
        x = preprocess_csv(config, inputs, model_path)
        with torch.no_grad():
            output = model(x)
            if config["modelType"] == "classification":
                probs = torch.softmax(output, dim=1)
                pred = torch.argmax(probs, dim=1).item()
                confidence = probs[0][pred].item()
                msg = f"Predicted class: {pred}\nConfidence: {confidence:.2%}"
            else:
                pred = output.item()
                msg = f"Predicted value: {pred:.3f}"
        print(msg)
    else:
        # Ensure inputs is always a list
        if isinstance(inputs, str):
            image_paths = [inputs]
        elif isinstance(inputs, list):
            image_paths = inputs
        else:
            raise ValueError("For images, 'inputs' must be a path string or list of paths.")

        if not image_paths:
            print("No images provided.")
            return

        for path in image_paths:
            x = preprocess_image(path, model_type=struct)
            with torch.no_grad():
                output = model(x)
                if config["modelType"] == "classification":
                    probs = torch.softmax(output, dim=1)
                    pred = torch.argmax(probs, dim=1).item()
                    confidence = probs[0][pred].item()
                    msg = f"{os.path.basename(path)} -> Predicted class: {pred}, Confidence: {confidence:.2%}"
                else:
                    pred = output.item()
                    msg = f"{os.path.basename(path)} -> Predicted value: {pred:.3f}"
            print(msg)

if __name__ == "__main__":
    main()
