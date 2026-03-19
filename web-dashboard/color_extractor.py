from PIL import Image
import sys
from collections import Counter

try:
    img = Image.open(sys.argv[1]).convert('RGB')
    if img.size[0] > 100 or img.size[1] > 100:
        img = img.resize((50, 50)) # scale down for speed
    pixels = list(img.getdata())
    # Filter out white/black/grays
    colored_pixels = [p for p in pixels if not (abs(p[0]-p[1]) < 20 and abs(p[1]-p[2]) < 20 and p[0] > 200)]
    if not colored_pixels: colored_pixels = pixels
    most_common = Counter(colored_pixels).most_common(1)[0][0]
    print(f"HEX: #{most_common[0]:02x}{most_common[1]:02x}{most_common[2]:02x}")
except Exception as e:
    print(f"Error: {e}")
