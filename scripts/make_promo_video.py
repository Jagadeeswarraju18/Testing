import os
from moviepy import ImageClip, concatenate_videoclips, vfx

# Configuration
SHOWCASE_DIR = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase"
OUTPUT_PATH = r"c:\SubTracker\subtrack---smart-subscription-manager\public\showcase\promo_video.mp4"
SLIDE_DURATION = 3.0  # Seconds per slide
TRANSITION_DURATION = 0.5  # Seconds

MOCKUP_FILES = [
    "Play Store 1.png",
    "Play Store 2.png",
    "Play Store 3.png",
    "Play Store 4.png",
    "Play Store 5.png",
    "Play Store 6.png",
    "Play Store 7.png"
]

def make_promo_video():
    clips = []
    
    print("--- Starting Promo Video Generation ---")
    
    for filename in MOCKUP_FILES:
        img_path = os.path.join(SHOWCASE_DIR, filename)
        if not os.path.exists(img_path):
            print(f"Warning: {filename} not found!")
            continue
            
        print(f"Processing {filename}...")
        
        # Create clip for each image
        clip = ImageClip(img_path).with_duration(SLIDE_DURATION)
        
        # Add internal crossfade logic using moviepy's crossfadein/out
        # To make concatenating with transitions easier, we use padding
        clip = clip.with_effects([vfx.CrossFadeIn(TRANSITION_DURATION), vfx.CrossFadeOut(TRANSITION_DURATION)])
        
        clips.append(clip)

    if not clips:
        print("Error: No mockup images found to process!")
        return

    print(f"Stitching {len(clips)} slides...")
    
    # Concatenate clips with a method that overlaps them slightly for the crossfade
    final_video = concatenate_videoclips(clips, method="compose", padding=-TRANSITION_DURATION)
    
    print(f"Exporting to {OUTPUT_PATH}...")
    
    # Export with high-quality settings
    final_video.write_videofile(
        OUTPUT_PATH, 
        fps=30, 
        codec="libx264", 
        audio=False, 
        preset="slow", 
        bitrate="5000k"
    )
    
    print("\nSUCCESS: Play Store Promo Video created!")

if __name__ == "__main__":
    make_promo_video()
