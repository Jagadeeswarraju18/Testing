import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Configuration
CANVAS_SIZE = (1024, 500)
SHOWCASE_DIR = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase"
OUTPUT_PATH = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase\feature_graphic_v2.png"

def create_ultra_premium_bg(size):
    # Professional Sophisticated Mid-Dark Grey / Charcoal Base
    top_color = (30, 32, 35) 
    bot_color = (15, 16, 18)
    base = Image.new('RGB', size, top_color)
    top = Image.new('RGB', size, bot_color)
    mask = Image.new('L', size)
    mask_draw = ImageDraw.Draw(mask)
    for y in range(size[1]):
        mask_draw.line([(0, y), (size[0], y)], fill=int(255 * (y / size[1])))
    base.paste(top, (0, 0), mask)
    
    draw = ImageDraw.Draw(base, "RGBA")
    
    # 1. Subtle Grid Accents (Fintech Look)
    grid_gap = 50
    for x in range(0, size[0], grid_gap):
        draw.line([(x, 0), (x, size[1])], fill=(255, 255, 255, 5))
    for y in range(0, size[1], grid_gap):
        draw.line([(0, y), (size[0], y)], fill=(255, 255, 255, 5))
        
    # 2. Large Background Bloom
    draw.ellipse([400, -100, 1200, 600], fill=(255, 255, 255, 10))
    
    # 3. Bottom Gradient Shadow
    draw.rectangle([0, size[1]-100, size[0], size[1]], fill=(0, 0, 0, 80))
    
    return base

def add_rounded_corners(img, radius):
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + img.size, radius=radius, fill=255)
    result = img.convert("RGBA")
    result.putalpha(mask)
    return result

def create_feature_graphic_v2():
    # 1. Background
    canvas = create_ultra_premium_bg(CANVAS_SIZE)
    draw = ImageDraw.Draw(canvas, "RGBA")
    
    # 2. Load Screenshots for Fan
    dashboard_path = os.path.join(SHOWCASE_DIR, "App Icon 1.jpg")
    analytics_path = os.path.join(SHOWCASE_DIR, "App Icon 6.jpg")
    
    # Fonts
    try:
        brand_font = ImageFont.truetype("arialbd.ttf", 95)
        tagline_font = ImageFont.truetype("arial.ttf", 36)
    except:
        brand_font = ImageFont.load_default()
        tagline_font = ImageFont.load_default()

    # --- BRANDING BLOCK (Left/Center) ---
    draw.text((70, 150), "Spendyx", font=brand_font, fill=(255, 255, 255))
    draw.text((72, 260), "SMART SUBSCRIPTION MANAGER", font=tagline_font, fill=(180, 185, 190))
    draw.text((72, 310), "All-in-one financial tracker", font=tagline_font, fill=(120, 125, 130))

    # --- DEVICE SHOWCASE (Right-Aligned Fan) ---
    
    # 10-Inch Tablet Mockup (Back Layer)
    if os.path.exists(analytics_path):
        tab_ss = Image.open(analytics_path)
        t_w = 420
        ratio = float(tab_ss.size[0]) / float(tab_ss.size[1])
        t_h = int(t_w / ratio)
        tab_ss = tab_ss.resize((t_w, t_h), Image.Resampling.LANCZOS)
        tab_ss = add_rounded_corners(tab_ss, radius=20)
        
        # Tablet Body
        bp = 8 # Bezel
        tablet = Image.new("RGBA", (t_w + bp*2, t_h + bp*2), (5, 5, 8))
        tablet_draw = ImageDraw.Draw(tablet)
        tablet_draw.rounded_rectangle([0,0, t_w+bp*2, t_h+bp*2], radius=30, outline=(60, 62, 65), width=2)
        tablet.paste(tab_ss, (bp, bp), tab_ss)
        
        # Paste Tablet (Back)
        canvas.paste(tablet, (620, 100), tablet)

    # Phone Mockup (Front Layer)
    if os.path.exists(dashboard_path):
        phone_ss = Image.open(dashboard_path)
        p_w = 280
        ratio = float(phone_ss.size[0]) / float(phone_ss.size[1])
        p_h = int(p_w / ratio)
        phone_ss = phone_ss.resize((p_w, p_h), Image.Resampling.LANCZOS)
        phone_ss = add_rounded_corners(phone_ss, radius=35)
        
        # Phone Body
        bp = 10
        phone = Image.new("RGBA", (p_w + bp*2, p_h + bp*2), (2, 2, 5))
        phone_draw = ImageDraw.Draw(phone)
        phone_draw.rounded_rectangle([0,0, p_w+bp*2, p_h+bp*2], radius=45, outline=(80, 85, 90), width=2)
        # Camera
        phone_draw.ellipse([ (p_w+bp*2)//2 - 6, 12, (p_w+bp*2)//2 + 6, 24], fill=(0,0,0))
        phone.paste(phone_ss, (bp, bp), phone_ss)
        
        # Paste Phone (Front, slightly offset)
        # Add shadow under phone
        draw.ellipse([540, 420, 880, 460], fill=(0, 0, 0, 120))
        canvas.paste(phone, (560, 140), phone)

    # 4. Save
    canvas.save(OUTPUT_PATH, "PNG")
    print(f"Created 10/10 Feature Graphic V2: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_feature_graphic_v2()
