import os
from PIL import Image, ImageOps

def generate_icons(source_path):
    # Open the source image
    img = Image.open(source_path).convert("RGBA")

    base_res_dir = r"android/app/src/main/res"

    # --- 1. App Launcher Icons (Standard & Adaptive) ---
    # These use 48dp baseline
    launcher_sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }

    # Scale factor for launcher (60% to add MORE padding)
    # Safe zone for adaptive icons is center 66%, so 60% is extremely safe.
    LAUNCHER_SCALE = 0.60 

    for folder, size in launcher_sizes.items():
        path = os.path.join(base_res_dir, folder)
        if not os.path.exists(path):
            os.makedirs(path)
        
        # Create canvas
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        logo_size = int(size * LAUNCHER_SCALE)
        logo = img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        offset = (size - logo_size) // 2
        canvas.paste(logo, (offset, offset), logo)
        
        # Save Launcher files
        canvas.save(os.path.join(path, "ic_launcher.png"))
        canvas.save(os.path.join(path, "ic_launcher_round.png"))
        canvas.save(os.path.join(path, "ic_launcher_foreground.png"))
        
        print(f"Generated launcher {folder} ({size}x{size})")


    # --- 2. Notification Small Icon ---
    # These use 24dp baseline and are typically smaller.
    # Android forces these to be white-only on newer versions. 
    # Valid sizes: mdpi=24, hdpi=36, xhdpi=48, xxhdpi=72, xxxhdpi=96
    notif_sizes = {
        'mipmap-mdpi': 24,
        'mipmap-hdpi': 36,
        'mipmap-xhdpi': 48,
        'mipmap-xxhdpi': 72,
        'mipmap-xxxhdpi': 96
    }
    
    # We generally don't pad notification icons as much, or they become tiny.
    # But since the logo is wide/complex, let's keep it tight.
    # Also, ideally we should convert to grayscale/white for "correctness", 
    # but for now we just resize the color logo so it exists.
    
    for folder, size in notif_sizes.items():
        path = os.path.join(base_res_dir, folder)
        if not os.path.exists(path):
            os.makedirs(path)
            
        # Resize directly (no padding/canvas for max visibility in small area)
        # Using containment to preserve aspect ratio if needed, but here we force square.
        # If logo is not square, this might squash. The current logo looks roughly square-ish.
        # Let's fit it within the square maintaining aspect ratio.
        
        icon = img.copy()
        icon.thumbnail((size, size), Image.Resampling.LANCZOS)
        
        # Create transparent canvas to center if aspect ratio is different
        final_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        bg_w, bg_h = final_icon.size
        img_w, img_h = icon.size
        offset = ((bg_w - img_w) // 2, (bg_h - img_h) // 2)
        final_icon.paste(icon, offset)
        
        final_icon.save(os.path.join(path, "ic_notification.png"))
        print(f"Generated notification {folder} ({size}x{size})")


    # --- 3. PWA Icons ---
    public_dir = "public"
    pwa_sizes = {
        'pwa-192x192.png': 192,
        'pwa-512x512.png': 512
    }

    for filename, size in pwa_sizes.items():
        icon = img.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(os.path.join(public_dir, filename))
        print(f"Generated PWA {filename} ({size}x{size})")

if __name__ == "__main__":
    if os.path.exists("public/Spendyx.png"):
        generate_icons("public/Spendyx.png")
    else:
        print("Error: Source image public/Spendyx.png not found")
