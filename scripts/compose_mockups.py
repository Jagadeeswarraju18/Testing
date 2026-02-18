import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Configuration
CANVAS_SIZE = (1080, 1920)
TEXT_COLOR = (255, 255, 255)
SUBTEXT_COLOR = (140, 140, 140)

# Paths
SHOWCASE_DIR = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase"
OUTPUT_DIR = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase"

MOCKUPS = [
    ("App Icon 1.jpg", "TRACK ALL SUBSCRIPTIONS", "STAY ON TOP OF EVERY SUBSCRIPTION INSTANTLY"),
    ("App Icon 2.jpg", "TRACK BUSINESS SPEND", "KEEP TEAM SPENDS SEPARATE AND CLEAR"),
    ("App Icon 4.jpg", "ADD SUBSCRIPTIONS FAST", "VOICE COMMANDS FOR INSTANT TRACKING"),
    ("App Icon 3.jpg", "SMART SUGGESTIONS", "CATCH HIDDEN PRICE SPIKES AUTOMATICALLY"),
    ("App Icon 5.jpg", "VIEW BILLS BY DATE", "NEVER MISS A PAYMENT AGAIN"),
    ("App Icon 6.jpg", "SMART ANALYTICS", "VISUALIZE YOUR SPENDING TRENDS"),
    ("App Icon 7.jpg", "CUSTOMIZE EVERYTHING", "LOCAL EXPORT, CURRENCY & BUDGETS"),
]

def add_rounded_corners(img, radius):
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + img.size, radius=radius, fill=255)
    result = img.convert("RGBA")
    result.putalpha(mask)
    return result

def create_ultra_dark_pro_bg(size):
    # Professional Sophisticated Ultra-Dark Grey/Black Gradient
    top_color = (22, 23, 25) # Very Dark Slate
    bot_color = (12, 13, 14) # Almost Black
    base = Image.new('RGB', size, top_color)
    top = Image.new('RGB', size, bot_color)
    mask = Image.new('L', size)
    mask_draw = ImageDraw.Draw(mask)
    for y in range(size[1]):
        mask_draw.line([(0, y), (size[0], y)], fill=int(255 * (y / size[1])))
    base.paste(top, (0, 0), mask)
    
    # Sophisticated light sweep highlight
    draw = ImageDraw.Draw(base, "RGBA")
    draw.polygon([(0, 0), (size[0], 0), (0, 500)], fill=(255, 255, 255, 6))
    return base

def create_mockup(index, icon_file, title, subtitle):
    canvas = create_ultra_dark_pro_bg(CANVAS_SIZE)
    draw = ImageDraw.Draw(canvas)
    
    try:
        title_font = ImageFont.truetype("arialbd.ttf", 68)
        sub_font = ImageFont.truetype("arial.ttf", 34)
    except:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        
    # 3. Draw Text HIGH
    t_bbox = draw.textbbox((0, 0), title, font=title_font)
    t_w = t_bbox[2] - t_bbox[0]
    draw.text(((CANVAS_SIZE[0] - t_w)//2, 100), title, font=title_font, fill=TEXT_COLOR)
    
    s_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
    s_w = s_bbox[2] - s_bbox[0]
    draw.text(((CANVAS_SIZE[0] - s_w)//2, 185), subtitle, font=sub_font, fill=SUBTEXT_COLOR)
    
    img_path = os.path.join(SHOWCASE_DIR, icon_file)
    if not os.path.exists(img_path): return
    screenshot = Image.open(img_path)
    
    # 5. Scaling
    target_w = 930
    ratio = float(screenshot.size[0]) / float(screenshot.size[1])
    target_h = int(target_w / ratio)
    if target_h > 1580:
        target_h = 1580
        target_w = int(target_h * ratio)

    # RESIZE WITH SHARPENING
    screenshot = screenshot.resize((target_w, target_h), Image.Resampling.LANCZOS)
    # Apply UnsharpMask to make text pop after upscale
    screenshot = screenshot.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))
    
    screenshot = add_rounded_corners(screenshot, radius=65)
    
    bezel_padding = 16 
    bezel_w = target_w + bezel_padding * 2
    bezel_h = target_h + bezel_padding * 2
    phone_x = (CANVAS_SIZE[0] - bezel_w) // 2
    phone_y = CANVAS_SIZE[1] - bezel_h - 10
    
    # 7. Paste Screenshot FIRST
    canvas.paste(screenshot, (phone_x + bezel_padding, phone_y + bezel_padding), screenshot)
    
    # --- HARDWARE OVERLAY ---
    # Obsidian Metallic Bezel
    draw.rounded_rectangle(
        [phone_x, phone_y, phone_x + bezel_w, phone_y + bezel_h],
        radius=90, fill=None, outline=(60, 62, 65), width=bezel_padding
    )
    # Inner thin display edge for sharpness
    draw.rounded_rectangle(
        [phone_x + bezel_padding - 1, phone_y + bezel_padding - 1, 
         phone_x + bezel_w - bezel_padding + 1, phone_y + bezel_h - bezel_padding + 1],
        radius=66, fill=None, outline=(0, 0, 0), width=2
    )
    
    # Hardware Buttons
    draw.rounded_rectangle([phone_x + bezel_w, phone_y + 350, phone_x + bezel_w + 5, phone_y + 450], radius=4, fill=(50, 52, 55))
    draw.rounded_rectangle([phone_x + bezel_w, phone_y + 480, phone_x + bezel_w + 5, phone_y + 630], radius=4, fill=(50, 52, 55))
    
    # --- CAMERA ---
    cam_x = CANVAS_SIZE[0] // 2
    cam_y = phone_y + 45
    cam_radius = 11
    draw.ellipse([cam_x - cam_radius, cam_y - cam_radius, cam_x + cam_radius, cam_y + cam_radius], fill=(2, 2, 2))
    draw.ellipse([cam_x - 3, cam_y - 3, cam_x + 2, cam_y + 2], fill=(20, 20, 35, 200))
    
    # 8. Save
    output_path = os.path.join(OUTPUT_DIR, f"Play Store {index+1}.png")
    canvas.save(output_path, quality=95) # High quality save
    print(f"Created: {output_path}")

# Run
for i, (icon, title, sub) in enumerate(MOCKUPS):
    create_mockup(i, icon, title, sub)
