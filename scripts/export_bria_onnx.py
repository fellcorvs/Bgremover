import torch
import torch.onnx
import numpy as np
from transformers import AutoModelForImageSegmentation
import argparse
import os, json, sys

def export_bria_to_onnx(output_path: str, opset: int = 14, fp16: bool = False) -> str:
    device = "cpu"
    model = AutoModelForImageSegmentation.from_pretrained(
        "briaai/RMBG-1.4", trust_remote_code=True
    )
    model.to(device)
    model.eval()

    dummy_input = torch.randn(1, 3, 1024, 1024)

    if fp16:
        model = model.half()
        dummy_input = dummy_input.half()

    output_path = os.path.abspath(output_path)
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=["pixel_values"],
        output_names=["mask"],
        dynamic_axes={
            "pixel_values": {0: "batch_size", 2: "height", 3: "width"},
            "mask": {0: "batch_size", 2: "height", 3: "width"},
        },
        opset_version=opset,
        do_constant_folding=True,
    )

    # Embed external data into the model file
    import onnx
    onnx_model = onnx.load(output_path)
    onnx.save(onnx_model, output_path)  # saves with all data embedded

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(json.dumps({
        "success": True,
        "output": output_path,
        "size_mb": round(size_mb, 2),
        "fp16": fp16,
    }))
    return output_path

if __name__ == "__main__":
    import json, sys
    parser = argparse.ArgumentParser()
    parser.add_argument("output_path", help="Path to save ONNX model")
    parser.add_argument("--opset", type=int, default=14)
    parser.add_argument("--fp16", action="store_true", help="Export in FP16")
    args = parser.parse_args()
    try:
        export_bria_to_onnx(args.output_path, args.opset, args.fp16)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
