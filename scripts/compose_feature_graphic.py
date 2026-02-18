import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Configuration
CANVAS_SIZE = (1024, 500)
SHOWCASE_DIR = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase"
OUTPUT_PATH = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase\feature_graphic.png"

def create_premium_horizontal_bg(size):
    # Professional Dark Charcoal Gradient
    top_color = (25, 26, 28)
    bot_color = (12, 13, 14)
    base = Image.new('RGB', size, top_color)
    top = Image.new('RGB', size, bot_color)
    mask = Image.new('L', size)
    mask_draw = ImageDraw.Draw(mask)
    for y in range(size[1]):
        mask_draw.line([(0, y), (size[0], y)], fill=int(255 * (y / size[1])))
    base.paste(top, (0, 0), mask)
    
    # Add sophisticated background accents
    draw = ImageDraw.Draw(base, "RGBA")
    
    # Left bloom (behind text)
    draw.ellipse([-200, -200, 400, 400], fill=(255, 255, 255, 12))
    
    # Diagonal light sweep
    draw.polygon([(200, 0), (700, 0), (100, 500)], fill=(255, 255, 255, 5))
    
    return base

def add_rounded_corners(img, radius):
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + img.size, radius=radius, fill=255)
    result = img.convert("RGBA")
    result.putalpha(mask)
    return result

def create_feature_graphic():
    # 1. Background
    canvas = create_premium_horizontal_bg(CANVAS_SIZE)
    draw = ImageDraw.Draw(canvas, "RGBA")
    
    # 2. Add Branding Text (Left Side)
    try:
        # Use a bold, modern font
        brand_font = ImageFont.truetype("arialbd.ttf", 90)
        tagline_font = ImageFont.truetype("arial.ttf", 34)
    except:
        brand_font = ImageFont.load_default()
        tagline_font = ImageFont.load_default()
        
    draw.text((80, 160), "Spendyx", font=brand_font, fill=(255, 255, 255))
    draw.text((80, 265), "Smart Subscription Manager", font=tagline_font, fill=(160, 162, 165))
    
    # 3. Add Device Mockup (Right Side)
    # Load Dashboard Screenshot
    ss_path = os.path.join(SHOWCASE_DIR, "App Icon 1.jpg")
    if os.path.exists(ss_path):
        screenshot = Image.open(ss_path)
        
        # Scaling for horizontal graphic
        target_w = 400
        ratio = float(screenshot.size[0]) / float(screenshot.size[1])
        target_h = int(target_w / ratio)
        
        screenshot = screenshot.resize((target_w, target_h), Image.Resampling.LANCZOS)
        screenshot = screenshot.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))
        screenshot = add_rounded_corners(screenshot, radius=35)
        
        # Create Bezel
        bezel_padding = 10
        bezel_w = target_w + bezel_padding * 2
        bezel_h = target_h + bezel_padding * 2
        
        # Position (Angled slightly or just right-aligned)
        phone_x = 580
        phone_y = 60 # Slightly visible from top
        
        # Phone Base (Obsidian)
        device_mask = Image.new("RGBA", (bezel_w, bezel_h), (0,0,0,0))
        d_draw = ImageDraw.Draw(device_mask)
        d_draw.rounded_rectangle([0, 0, bezel_w, bezel_h], radius=50, fill=(5, 5, 8), outline=(60, 62, 65), width=2)
        
        # Paste Screenshot on Device
        device_mask.paste(screenshot, (bezel_padding, bezel_padding), screenshot)
        
        # Final paste on canvas
        canvas.paste(device_mask, (phone_x, phone_y), device_mask)
        
        # Add a "Floating" shadow/glow under the phone
        draw.ellipse([phone_x, phone_y + bezel_h - 20, phone_x + bezel_w, phone_y + bezel_h + 20], fill=(0, 0, 0, 100))

    # 4. Save
    canvas.save(OUTPUT_PATH, "PNG")
    print(f"Created Template-Style Feature Graphic: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_feature_graphic()
