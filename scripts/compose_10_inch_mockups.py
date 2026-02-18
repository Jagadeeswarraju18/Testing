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
    top_color = (22, 23, 25)
    bot_color = (12, 13, 14)
    base = Image.new('RGB', size, top_color)
    top = Image.new('RGB', size, bot_color)
    mask = Image.new('L', size)
    mask_draw = ImageDraw.Draw(mask)
    for y in range(size[1]):
        mask_draw.line([(0, y), (size[0], y)], fill=int(255 * (y / size[1])))
    base.paste(top, (0, 0), mask)
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
        
    draw.text(((CANVAS_SIZE[0] - draw.textbbox((0, 0), title, font=title_font)[2])//2, 100), title, font=title_font, fill=TEXT_COLOR)
    draw.text(((CANVAS_SIZE[0] - draw.textbbox((0, 0), subtitle, font=sub_font)[2])//2, 185), subtitle, font=sub_font, fill=SUBTEXT_COLOR)
    
    img_path = os.path.join(SHOWCASE_DIR, icon_file)
    if not os.path.exists(img_path): return
    screenshot = Image.open(img_path)
    
    # 5. 10-Inch Tablet Scaling
    # Larger screen, thinner bezels relative to 7-inch
    target_w = 960 # Maximized for 10-inch look
    ratio = float(screenshot.size[0]) / float(screenshot.size[1])
    target_h = int(target_w / ratio)
    if target_h > 1620:
        target_h = 1620
        target_w = int(target_h * ratio)

    screenshot = screenshot.resize((target_w, target_h), Image.Resampling.LANCZOS)
    screenshot = screenshot.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))
    screenshot = add_rounded_corners(screenshot, radius=20) # Sleeker corners for 10-inch
    
    # 6. 10-Inch Frame (Thinner, more premium than 7-inch)
    bezel_padding = 18 # Sleeker bezel
    bezel_w = target_w + bezel_padding * 2
    bezel_h = target_h + bezel_padding * 2
    phone_x = (CANVAS_SIZE[0] - bezel_w) // 2
    phone_y = CANVAS_SIZE[1] - bezel_h - 10
    
    canvas.paste(screenshot, (phone_x + bezel_padding, phone_y + bezel_padding), screenshot)
    
    # --- TABLET HARDWARE OVERLAY ---
    # Obsidian Metallic Bezel
    draw.rounded_rectangle(
        [phone_x, phone_y, phone_x + bezel_w, phone_y + bezel_h],
        radius=40, fill=None, outline=(10, 10, 12), width=bezel_padding
    )
    # Outer Sharp Edge
    draw.rounded_rectangle(
        [phone_x, phone_y, phone_x + bezel_w, phone_y + bezel_h],
        radius=40, fill=None, outline=(50, 52, 55, 120), width=3
    )
    
    # Camera (at top)
    cam_x = CANVAS_SIZE[0] // 2
    cam_y = phone_y + (bezel_padding // 2)
    draw.ellipse([cam_x - 6, cam_y - 6, cam_x + 6, cam_y + 6], fill=(0, 0, 0))
    
    # 8. Save as PNG
    output_path = os.path.join(OUTPUT_DIR, f"Play Store 10 inch {index+1}.png")
    canvas.save(output_path, "PNG")
    print(f"Created 10-Inch Tablet Mockup: {output_path}")

# Run
for i, (icon, title, sub) in enumerate(MOCKUPS):
    create_mockup(i, icon, title, sub)
