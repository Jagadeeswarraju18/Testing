import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from moviepy import ImageClip, CompositeVideoClip, ColorClip, vfx

# Configuration
SHOWCASE_DIR = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase"
OUTPUT_PATH = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase\app_walkthrough.mp4"
CANVAS_SIZE = (1080, 1920)

# SCALING & POSITIONING (V4 - CENTERED & REDUCED)
TARGET_DEVICE_W = 780 # Reduced from 930 for better balance
BEZEL_THICKNESS = 16

# Scene Mapping (File, Title, Subtitle, Tab To Highlight)
SCENES = [
    ("App Icon 1.jpg", "WELCOME TO SPENDYX", "Your subscription command center", 0),
    ("App Icon 2.jpg", "MANAGE WORKSPACES", "Separate personal and business spends", 1),
    ("App Icon 4.jpg", "ADD SUBSCRIPTIONS FAST", "One-tap entry for instant tracking", 2),
    ("App Icon 5.jpg", "PAYMENT CALENDAR", "Never miss a renewal date again", 3),
    ("App Icon 6.jpg", "SMART ANALYTICS", "Understand your spending trends", 4),
    ("App Icon 7.jpg", "CUSTOMIZE EVERYTHING", "Local export and smart budgets", 0),
]

def add_rounded_corners(img, radius):
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + img.size, radius=radius, fill=255)
    result = img.convert("RGBA")
    result.putalpha(mask)
    return result

def create_ultra_clean_bg(size):
    top_color = (22, 24, 28)
    bot_color = (12, 13, 14)
    base = Image.new('RGB', size, top_color)
    top = Image.new('RGB', size, bot_color)
    mask = Image.new('L', size)
    mask_draw = ImageDraw.Draw(mask)
    for y in range(size[1]):
        mask_draw.line([(0, y), (size[0], y)], fill=int(255 * (y / size[1])))
    base.paste(top, (0, 0), mask)
    draw = ImageDraw.Draw(base, "RGBA")
    # Soft centered glow to highlight the new centered phone
    draw.ellipse([240, 660, 840, 1260], fill=(255, 255, 255, 15))
    return base

def make_content_frame(img_path, tab_index):
    ss = Image.open(img_path).convert("RGBA")
    target_w = TARGET_DEVICE_W
    ratio = float(ss.size[0]) / float(ss.size[1])
    target_h = int(target_w / ratio)
    ss = ss.resize((target_w, target_h), Image.Resampling.LANCZOS)
    ss = ss.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))
    ss = add_rounded_corners(ss, radius=55) # slightly reduced radius for smaller width
    
    draw = ImageDraw.Draw(ss, "RGBA")
    ty = int((1210 / 1280) * target_h)
    tab_w = target_w // 5
    tx = (tab_index * tab_w) + (tab_w // 2)
    
    if tab_index != -1:
        for r in range(30, 0, -5):
            alpha = int(80 * (1 - r/30))
            draw.ellipse([tx-r, ty-r, tx+r, ty+r], fill=(255, 255, 255, alpha))
            
    return ss

def make_device_overlay(content_w, content_h):
    bezel_padding = BEZEL_THICKNESS
    frame_w = content_w + bezel_padding * 2
    frame_h = content_h + bezel_padding * 2
    
    device = Image.new("RGBA", (frame_w, frame_h), (0,0,0,0))
    d_draw = ImageDraw.Draw(device)
    
    # Obsidian Body
    d_draw.rounded_rectangle([0, 0, frame_w, frame_h], radius=82, fill=None, outline=(15, 16, 20), width=18)
    # Metallic highlighting
    d_draw.rounded_rectangle([2, 2, frame_w-2, frame_h-2], radius=80, fill=None, outline=(60, 62, 65), width=2)
    
    # Camera
    cam_x = frame_w // 2
    cam_y = 38 # moved up slightly for smaller frame
    d_draw.ellipse([cam_x-9, cam_y-9, cam_x+9, cam_y+9], fill=(0,0,0))
    d_draw.ellipse([cam_x-3, cam_y-3, cam_x+2, cam_y+2], fill=(60,60,100,180))
    
    return device

def generate_walkthrough_v4():
    print("--- Generating Balanced Centered Walkthrough (V4) ---")
    
    # 1. Background
    bg = create_ultra_clean_bg(CANVAS_SIZE)
    total_duration = len(SCENES) * 4.0 - (len(SCENES)-1) * 1.0 # overlapping transitions
    bg_clip = ImageClip(np.array(bg)).with_duration(total_duration)
    
    # Content Dimensions
    dummy_img = Image.open(os.path.join(SHOWCASE_DIR, SCENES[0][0]))
    ratio = float(dummy_img.size[0]) / float(dummy_img.size[1])
    content_w = TARGET_DEVICE_W
    content_h = int(content_w / ratio)
    
    # Phone Positioning (PERFECTLY CENTERED)
    frame_w = content_w + BEZEL_THICKNESS * 2
    frame_h = content_h + BEZEL_THICKNESS * 2
    phone_x = (CANVAS_SIZE[0] - frame_w) // 2
    phone_y = (CANVAS_SIZE[1] - frame_h) // 2 - 100 # slightly up to allow for overlay box
    
    # 2. Content Clips
    content_clips = []
    current_time = 0
    cx, cy = phone_x + BEZEL_THICKNESS, phone_y + BEZEL_THICKNESS

    for i, (file, title, sub, tab) in enumerate(SCENES):
        img_path = os.path.join(SHOWCASE_DIR, file)
        content_img = make_content_frame(img_path, tab)
        temp_path = f"content_{i}.png"
        content_img.save(temp_path)
        
        clip = ImageClip(temp_path).with_duration(4.0).with_start(current_time)
        if i > 0:
            clip = clip.with_effects([vfx.CrossFadeIn(0.5)])
        
        clip = clip.with_position((cx, cy))
        content_clips.append(clip)
        current_time += 3.0

    # 3. Static Phone Frame
    phone_frame = make_device_overlay(content_w, content_h)
    frame_clip = ImageClip(np.array(phone_frame)).with_duration(total_duration).with_position((phone_x, phone_y))
    
    # 4. Instructional Overlays (Bottom)
    overlay_clips = []
    overlay_y = 1580 # Kept at bottom for readability
    start_t = 0
    
    try:
        t_font = ImageFont.truetype("arialbd.ttf", 48)
        s_font = ImageFont.truetype("arial.ttf", 32)
    except:
        t_font = s_font = None

    for i, (_, title, sub, _) in enumerate(SCENES):
        overlay = Image.new("RGBA", (1080, 240), (0,0,0,0))
        o_draw = ImageDraw.Draw(overlay)
        # Glass box
        o_draw.rounded_rectangle([100, 0, 980, 220], radius=40, fill=(0, 0, 0, 180), outline=(255,255,255,40), width=2)
        
        if t_font:
            o_draw.text((150, 45), title, font=t_font, fill=(255, 255, 255))
            o_draw.text((150, 115), sub, font=s_font, fill=(180, 182, 185))
            
        o_clip = ImageClip(np.array(overlay)).with_duration(4.0).with_start(start_t)
        if i > 0: o_clip = o_clip.with_effects([vfx.CrossFadeIn(0.5)])
        o_clip = o_clip.with_position((0, overlay_y))
        overlay_clips.append(o_clip)
        start_t += 3.0
        
    # 5. Full Composite
    final = CompositeVideoClip([bg_clip] + content_clips + [frame_clip] + overlay_clips, size=CANVAS_SIZE)
    
    print(f"Exporting (V4) to {OUTPUT_PATH}...")
    final.write_videofile(OUTPUT_PATH, fps=30, codec="libx264", bitrate="8000k", preset="slow")
    
    # Cleanup
    for i in range(len(SCENES)):
        if os.path.exists(f"content_{i}.png"): os.remove(f"content_{i}.png")
    print("\nSUCCESS!")

if __name__ == "__main__":
    generate_walkthrough_v4()
