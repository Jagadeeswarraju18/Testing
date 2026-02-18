import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Configuration
CANVAS_SIZE = (1024, 500)
SHOWCASE_DIR = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase"
OUTPUT_PATH = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase\feature_graphic_v3.png"

def create_ultra_clean_bg(size):
    # Smooth, High-End Charcoal Gradient
    top_color = (28, 30, 32)
    bot_color = (12, 13, 15)
    base = Image.new('RGB', size, top_color)
    top = Image.new('RGB', size, bot_color)
    mask = Image.new('L', size)
    mask_draw = ImageDraw.Draw(mask)
    for y in range(size[1]):
        mask_draw.line([(0, y), (size[0], y)], fill=int(255 * (y / size[1])))
    base.paste(top, (0, 0), mask)
    
    # Soft light bloom behind text area
    draw = ImageDraw.Draw(base, "RGBA")
    draw.ellipse([-100, -100, 500, 500], fill=(255, 255, 255, 12))
    
    return base

def add_rounded_corners(img, radius):
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + img.size, radius=radius, fill=255)
    result = img.convert("RGBA")
    result.putalpha(mask)
    return result

def create_feature_graphic_v3():
    # 1. Background
    canvas = create_ultra_clean_bg(CANVAS_SIZE)
    draw = ImageDraw.Draw(canvas, "RGBA")
    
    # 2. Branding (Left Side - Clean & Bold)
    try:
        brand_font = ImageFont.truetype("arialbd.ttf", 94)
        tagline_font = ImageFont.truetype("arial.ttf", 36)
    except:
        brand_font = ImageFont.load_default()
        tagline_font = ImageFont.load_default()
        
    draw.text((80, 160), "Spendyx", font=brand_font, fill=(255, 255, 255))
    draw.text((82, 265), "Subscriptions Under Control", font=tagline_font, fill=(180, 182, 185))
    
    # 3. Flagship Focus Device (Right Side - Pixel 9 Pro Style)
    ss_path = os.path.join(SHOWCASE_DIR, "App Icon 1.jpg")
    if os.path.exists(ss_path):
        screenshot = Image.open(ss_path)
        
        # Scaling for horizontal graphic
        target_w = 420
        ratio = float(screenshot.size[0]) / float(screenshot.size[1])
        target_h = int(target_w / ratio)
        
        screenshot = screenshot.resize((target_w, target_h), Image.Resampling.LANCZOS)
        screenshot = screenshot.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))
        screenshot = add_rounded_corners(screenshot, radius=45)
        
        # --- HARDWARE FRAME (Obsidian Metallic) ---
        bezel_padding = 12
        frame_w = target_w + bezel_padding * 2
        frame_h = target_h + bezel_padding * 2
        
        # Create Frame Canvas
        device = Image.new("RGBA", (frame_w, frame_h), (0,0,0,0))
        d_draw = ImageDraw.Draw(device)
        
        # Obsidian Bezel (Outer)
        d_draw.rounded_rectangle(
            [0, 0, frame_w, frame_h],
            radius=60, fill=(15, 16, 20), outline=(60, 62, 65), width=2
        )
        # Inner Glass / Display Edge
        d_draw.rounded_rectangle(
            [2, 2, frame_w - 2, frame_h - 2],
            radius=58, fill=(5, 5, 8)
        )
        
        # Paste Screenshot on Device
        device.paste(screenshot, (bezel_padding, bezel_padding), screenshot)
        
        # Hardware Detail: Camera Hole
        cam_x = frame_w // 2
        cam_y = 32
        d_draw.ellipse([cam_x-7, cam_y-7, cam_x+7, cam_y+7], fill=(0,0,0))
        d_draw.ellipse([cam_x-2, cam_y-2, cam_x+2, cam_y+2], fill=(40,40,60,150))
        
        # Side Buttons (Visual Only)
        d_draw.rounded_rectangle([frame_w - 2, 100, frame_w, 150], radius=2, fill=(50,52,55))
        d_draw.rounded_rectangle([frame_w - 2, 170, frame_w, 230], radius=2, fill=(50,52,55))

        # 4. Final Paste with shadow
        phone_x = 580
        phone_y = 60 # Slightly visible from top
        
        # Professional Drop Shadow
        shadow_w, shadow_h = frame_w + 60, frame_h + 60
        shadow = Image.new("RGBA", (shadow_w, shadow_h), (0,0,0,0))
        s_draw = ImageDraw.Draw(shadow)
        s_draw.rounded_rectangle([30, 30, 30 + frame_w, 30 + frame_h], radius=60, fill=(0, 0, 0, 180))
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=25))
        
        canvas.paste(shadow, (phone_x - 30, phone_y - 20), shadow)
        canvas.paste(device, (phone_x, phone_y), device)
        
    # 5. Save
    canvas.save(OUTPUT_PATH, "PNG")
    print(f"Created 10/10 Flagship Feature Graphic: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_feature_graphic_v3()
