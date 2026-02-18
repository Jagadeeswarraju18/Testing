import os
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# --- SOFTWARE CONFIGURATION ---
CANVAS_SIZE = (1080, 1920)
BG_TOP = (28, 30, 32)
BG_BOT = (12, 13, 15)
TEXT_COLOR = (255, 255, 255)
SUBTEXT_COLOR = (140, 142, 145)

# Folders
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_DIR = os.path.join(BASE_DIR, "input")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

# Default Captions (Used if not overridden)
DEFAULT_CAPTIONS = [
    ("TRACK ALL SUBSCRIPTIONS", "STAY ON TOP OF EVERY SUBSCRIPTION INSTANTLY"),
    ("TRACK BUSINESS SPEND", "KEEP TEAM SPENDS SEPARATE AND CLEAR"),
    ("ADD SUBSCRIPTIONS FAST", "VOICE COMMANDS FOR INSTANT TRACKING"),
    ("SMART SUGGESTIONS", "CATCH HIDDEN PRICE SPIKES AUTOMATICALLY"),
    ("VIEW BILLS BY DATE", "NEVER MISS A PAYMENT AGAIN"),
    ("SMART ANALYTICS", "VISUALIZE YOUR SPENDING TRENDS"),
    ("CUSTOMIZE EVERYTHING", "LOCAL EXPORT, CURRENCY & BUDGETS"),
]

def add_rounded_corners(img, radius):
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + img.size, radius=radius, fill=255)
    result = img.convert("RGBA")
    result.putalpha(mask)
    return result

def create_background(size):
    base = Image.new('RGB', size, BG_TOP)
    top = Image.new('RGB', size, BG_BOT)
    mask = Image.new('L', size)
    mask_draw = ImageDraw.Draw(mask)
    for y in range(size[1]):
        mask_draw.line([(0, y), (size[0], y)], fill=int(255 * (y / size[1])))
    base.paste(top, (0, 0), mask)
    draw = ImageDraw.Draw(base, "RGBA")
    draw.ellipse([-100, -100, 500, 500], fill=(255, 255, 255, 12))
    return base

def draw_device(canvas, screenshot, device_type):
    draw = ImageDraw.Draw(canvas, "RGBA")
    
    # 1. Device Proportions
    if device_type == "phone":
        target_w, max_h, radius, b_pad, b_radius = 930, 1580, 65, 16, 92
    elif device_type == "tablet_7":
        target_w, max_h, radius, b_pad, b_radius = 900, 1550, 30, 25, 50
    else: # tablet_10
        target_w, max_h, radius, b_pad, b_radius = 960, 1620, 20, 18, 40

    # 2. Process Screenshot
    orig_w, orig_h = screenshot.size
    ratio = float(orig_w) / float(orig_h)
    target_h = int(target_w / ratio)
    if target_h > max_h:
        target_h = max_h
        target_w = int(target_h * ratio)

    screenshot = screenshot.resize((target_w, target_h), Image.Resampling.LANCZOS)
    screenshot = screenshot.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))
    screenshot = add_rounded_corners(screenshot, radius=radius)
    
    # 3. Framing
    bezel_w = target_w + b_pad * 2
    bezel_h = target_h + b_pad * 2
    px = (CANVAS_SIZE[0] - bezel_w) // 2
    py = CANVAS_SIZE[1] - bezel_h - 10
    
    # 4. Shadow
    shadow = Image.new("RGBA", (bezel_w+60, bezel_h+60), (0,0,0,0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle([30, 30, 30+bezel_w, 30+bezel_h], radius=b_radius, fill=(0,0,0,150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=25))
    canvas.paste(shadow, (px-30, py-20), shadow)
    
    # 5. Body & Bezel
    draw.rounded_rectangle([px, py, px+bezel_w, py+bezel_h], radius=b_radius, fill=(5,5,8), outline=(65,67,70), width=3)
    
    # 6. Paste Screenshot
    canvas.paste(screenshot, (px + b_pad, py + b_pad), screenshot)
    
    # 7. Hardware Details
    if device_type == "phone":
        cam_x, cam_y = CANVAS_SIZE[0]//2, py+45
        draw.ellipse([cam_x-11, cam_y-11, cam_x+11, cam_y+11], fill=(0,0,0))
        draw.ellipse([cam_x-3, cam_y-3, cam_x+2, cam_y+2], fill=(60,60,100,180))

def run_studio():
    print("--- Spendyx Mockup Studio Software ---")
    print(f"Reading from: {INPUT_DIR}")
    
    files = sorted([f for f in os.listdir(INPUT_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    if not files:
        print("Error: No images found in 'input' folder!")
        return

    print(f"Found {len(files)} screenshots. Starting full export...")
    
    modes = [("phone", "Play Store Phone"), ("tablet_7", "Play Store 7 inch"), ("tablet_10", "Play Store 10 inch")]
    
    for device_id, out_name in modes:
        print(f"\nGenerating {out_name} assets...")
        for i, filename in enumerate(files):
            # Load
            img = Image.open(os.path.join(INPUT_DIR, filename))
            canvas = create_background(CANVAS_SIZE)
            
            # Text
            draw = ImageDraw.Draw(canvas)
            title, subtitle = DEFAULT_CAPTIONS[i % len(DEFAULT_CAPTIONS)]
            try:
                t_f = ImageFont.truetype("arialbd.ttf", 68)
                s_f = ImageFont.truetype("arial.ttf", 34)
            except:
                t_f = ImageFont.load_default()
                s_f = ImageFont.load_default()
            
            draw.text(((CANVAS_SIZE[0] - draw.textbbox((0,0), title, font=t_f)[2])//2, 100), title, font=t_f, fill=TEXT_COLOR)
            draw.text(((CANVAS_SIZE[0] - draw.textbbox((0,0), subtitle, font=s_f)[2])//2, 185), subtitle, font=s_f, fill=SUBTEXT_COLOR)
            
            # Device
            draw_device(canvas, img, device_id)
            
            # Save
            out_path = os.path.join(OUTPUT_DIR, f"{out_name} {i+1}.png")
            canvas.save(out_path, "PNG")
            print(f"  [+] Saved {os.path.basename(out_path)}")

    print("\nSUCCESS: All mockups generated successfully in 'output' folder!")

if __name__ == "__main__":
    run_studio()
