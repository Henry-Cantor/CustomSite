import sys
import json
import torch
import numpy as np
import pandas as pd
import os
from PIL import Image
import torchvision.transforms as T
import torch.nn as nn
import torch.nn.functional as F
import pickle

def load_config(model_path):
    config_path = os.path.join(model_path, "config.json")
    with open(config_path) as f:
        return json.load(f)

def load_model(model_path, config):
    model_code = config.get("model_class_code")
    if not model_code:
        raise ValueError("No model_class_code found in config.json")

    # Make sure torch.nn is defined in exec scope
    exec_globals = {
        "torch": torch,
        "nn": nn,
        "F": F,
        "np": np
    }

    # Dynamically define the model class
    exec(model_code, exec_globals)

    model_class_name = config["modelStruct"].upper()  # e.g., "RNN"
    model_class = exec_globals.get(model_class_name)
    if not model_class:
        raise ValueError(f"Model class '{model_class_name}' not defined in model_class_code.")

    # Construct the model
    input_size = len(config["inputColumns"])
    output_size = 1 if config["modelType"] == "regression" else len(config.get("classes", [0, 1]))
    model = model_class(input_size, config["layerSize"], config["numLayers"], output_size)

    model.load_state_dict(torch.load(os.path.join(model_path, "model.pth"), map_location="cpu"))
    model.eval()
    return model

def preprocess_csv(config, input_dict, model_path):
    data = np.array([[float(input_dict[col]) for col in config["inputColumns"]]])

    # Apply the same scaler used in training
    scaler_path = os.path.join(model_path, "scaler.pkl")
    if os.path.exists(scaler_path):
        with open(scaler_path, "rb") as f:
            scaler = pickle.load(f)
        data = scaler.transform(data)

    return torch.tensor(data, dtype=torch.float32)

def preprocess_image(image_path):
    transform = T.Compose([
        T.Resize((64, 64)),
        T.ToTensor()
    ])
    image = Image.open(image_path).convert("RGB")
    return transform(image).unsqueeze(0)

def main():
    raw = sys.stdin.read()
    payload = json.loads(raw)
    model_path = payload["modelPath"]
    inputs = payload["inputs"]

    config = load_config(model_path)
    model = load_model(model_path, config)

    if config["inputType"] == "csv":
        x = preprocess_csv(config, inputs, model_path)
    else:
        image_path = inputs  # assumed to be path string
        x = preprocess_image(image_path)

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

if __name__ == "__main__":
    main()
