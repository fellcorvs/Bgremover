import sys
import json
import argparse
import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F
from transformers import AutoModelForImageSegmentation
from torchvision.transforms.functional import normalize


def preprocess_image(im: np.ndarray, model_input_size: list) -> torch.Tensor:
    im_tensor = torch.tensor(im, dtype=torch.float32).permute(2, 0, 1)
    im_tensor = F.interpolate(
        torch.unsqueeze(im_tensor, 0), size=model_input_size, mode="bilinear"
    )
    image = torch.divide(im_tensor, 255.0)
    image = normalize(image, [0.5, 0.5, 0.5], [1.0, 1.0, 1.0])
    return image


def postprocess_image(result: torch.Tensor, im_size: list) -> np.ndarray:
    result = torch.squeeze(F.interpolate(result, size=im_size, mode="bilinear"), 0)
    ma = torch.max(result)
    mi = torch.min(result)
    result = (result - mi) / (ma - mi)
    im_array = (result * 255).permute(1, 2, 0).cpu().data.numpy().astype(np.uint8)
    im_array = np.squeeze(im_array)
    return im_array


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path", help="Path to input image")
    parser.add_argument("output_path", help="Path to save output PNG")
    parser.add_argument(
        "--model",
        default="briaai/RMBG-1.4",
        help="HuggingFace model ID",
    )
    parser.add_argument("--device", default=None, help="Torch device override")
    parser.add_argument("--debug", action="store_true", help="Save debug mask")
    args = parser.parse_args()

    try:
        device_name = (
            args.device or ("cuda:0" if torch.cuda.is_available() else "cpu")
        )
        device = torch.device(device_name)

        model = AutoModelForImageSegmentation.from_pretrained(
            args.model, trust_remote_code=True
        )
        model.to(device)
        model.eval()

        orig_image = Image.open(args.input_path).convert("RGB")
        orig_im = np.array(orig_image)
        orig_im_size = list(orig_im.shape[0:2])
        model_input_size = [1024, 1024]
        image = preprocess_image(orig_im, model_input_size).to(device)

        with torch.no_grad():
            result = model(image)

        result_image = postprocess_image(result[0][0], orig_im_size)

        if args.debug:
            debug_path = args.output_path.replace(".png", "_mask.png")
            Image.fromarray(result_image).save(debug_path)

        pil_mask_im = Image.fromarray(result_image)
        orig_rgba = Image.open(args.input_path).convert("RGBA")
        orig_rgba.putalpha(pil_mask_im)
        orig_rgba.save(args.output_path, "PNG")

        print(json.dumps({"success": True, "output": args.output_path}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
