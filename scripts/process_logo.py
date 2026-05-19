"""
Process the original TACT logo PDF properly.
Strategy: Use the original high-quality PDF render and create:
1. logo-dark.png - for dark backgrounds (inverted text: white, orange kept)
2. logo-light.png - for light backgrounds (original dark text, orange kept)
"""
from PIL import Image, ImageFilter, ImageOps
import numpy as np
import fitz

def extract_and_process():
    # Extract from PDF at high DPI
    doc = fitz.open('models/logo.pdf')
    page = doc[0]
    pix = page.get_pixmap(dpi=300, alpha=False)
    
    # Save temp raw
    raw_path = 'client/public/logo_raw_rgb.png'
    pix.save(raw_path)
    
    img = Image.open(raw_path).convert('RGBA')
    data = np.array(img, dtype=np.float64)
    r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]
    
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    gray_mean = (r + g + b) / 3.0
    sat = np.sqrt(((r - gray_mean)**2 + (g - gray_mean)**2 + (b - gray_mean)**2) / 3.0)
    
    print(f'Image size: {img.size}')
    print(f'Luminance range: {lum.min():.0f}-{lum.max():.0f}')
    print(f'Saturation range: {sat.min():.1f}-{sat.max():.1f}')
    
    # The original has a gray gradient background (~175-200)
    # Dark text (TACT letters + shadow) (~0-100)  
    # Orange exclamation mark (~200+ red, 80-160 green, 0-50 blue)
    
    # ---- CLASSIFICATION ----
    
    # Orange colored: high R, medium G, low B, significant saturation
    is_orange = (sat > 15) & (r > 100) & (r > g) & (g > b)
    
    # Pure background: bright neutral gray
    is_bg = (sat < 8) & (lum > 160)
    
    # Near-background: slightly less bright gray
    is_near_bg = (sat < 8) & (lum > 130) & (lum <= 160)
    
    # Dark content (text, shadows)
    is_dark = (lum < 100) & (sat < 20) & ~is_orange
    
    # Semi-dark (text anti-aliasing, glow)
    is_semi = (lum >= 100) & (lum <= 130) & (sat < 15) & ~is_orange
    
    # ---- DARK VARIANT (white text on transparent) ----
    dark_out = np.zeros((*data.shape[:2], 4), dtype=np.uint8)
    
    # Background → transparent (already zeros)
    
    # Near-background → very subtle white glow
    near_alpha = np.clip((160 - lum[is_near_bg]) / 30 * 40, 0, 40)
    dark_out[is_near_bg, 0] = 255
    dark_out[is_near_bg, 1] = 255
    dark_out[is_near_bg, 2] = 255
    dark_out[is_near_bg, 3] = near_alpha.astype(np.uint8)
    
    # Semi-dark → white with moderate alpha
    semi_alpha = np.clip((130 - lum[is_semi]) / 50 * 160, 20, 160)
    dark_out[is_semi, 0] = 255
    dark_out[is_semi, 1] = 255
    dark_out[is_semi, 2] = 255
    dark_out[is_semi, 3] = semi_alpha.astype(np.uint8)
    
    # Dark content → bright white, strong alpha
    dark_alpha = np.clip((130 - lum[is_dark]) / 130 * 255, 80, 255)
    dark_out[is_dark, 0] = 255
    dark_out[is_dark, 1] = 255
    dark_out[is_dark, 2] = 255
    dark_out[is_dark, 3] = dark_alpha.astype(np.uint8)
    
    # Orange → keep original colors with full alpha
    dark_out[is_orange, 0] = np.clip(r[is_orange], 0, 255).astype(np.uint8)
    dark_out[is_orange, 1] = np.clip(g[is_orange], 0, 255).astype(np.uint8)
    dark_out[is_orange, 2] = np.clip(b[is_orange], 0, 255).astype(np.uint8)
    # Alpha based on saturation (more saturated = more opaque)
    orange_alpha = np.clip(sat[is_orange] / 60 * 255, 80, 255)
    dark_out[is_orange, 3] = orange_alpha.astype(np.uint8)
    
    dark_result = Image.fromarray(dark_out)
    
    # Smooth alpha edges slightly
    r_ch, g_ch, b_ch, a_ch = dark_result.split()
    a_ch = a_ch.filter(ImageFilter.GaussianBlur(radius=1.2))
    dark_result = Image.merge('RGBA', (r_ch, g_ch, b_ch, a_ch))
    
    # Crop to content
    bbox = dark_result.getbbox()
    if bbox:
        pad = 30
        left = max(0, bbox[0] - pad)
        upper = max(0, bbox[1] - pad)
        right = min(dark_result.width, bbox[2] + pad)
        lower = min(dark_result.height, bbox[3] + pad)
        dark_result = dark_result.crop((left, upper, right, lower))
    
    print(f'Dark variant cropped: {dark_result.size}')
    
    # ---- LIGHT VARIANT (dark text on transparent) ----
    light_out = np.zeros((*data.shape[:2], 4), dtype=np.uint8)
    
    # Near-background → subtle dark glow
    near_alpha_l = np.clip((160 - lum[is_near_bg]) / 30 * 30, 0, 30)
    light_out[is_near_bg, 0] = 40
    light_out[is_near_bg, 1] = 40
    light_out[is_near_bg, 2] = 40
    light_out[is_near_bg, 3] = near_alpha_l.astype(np.uint8)
    
    # Semi-dark → dark with moderate alpha
    semi_alpha_l = np.clip((130 - lum[is_semi]) / 50 * 140, 15, 140)
    light_out[is_semi, 0] = 30
    light_out[is_semi, 1] = 30
    light_out[is_semi, 2] = 30
    light_out[is_semi, 3] = semi_alpha_l.astype(np.uint8)
    
    # Dark content → keep dark with strong alpha
    dark_alpha_l = np.clip((130 - lum[is_dark]) / 130 * 255, 80, 255)
    light_out[is_dark, 0] = np.clip(r[is_dark] * 0.3, 0, 50).astype(np.uint8)
    light_out[is_dark, 1] = np.clip(g[is_dark] * 0.3, 0, 50).astype(np.uint8)
    light_out[is_dark, 2] = np.clip(b[is_dark] * 0.3, 0, 50).astype(np.uint8)
    light_out[is_dark, 3] = dark_alpha_l.astype(np.uint8)
    
    # Orange → same as dark variant
    light_out[is_orange, 0] = np.clip(r[is_orange], 0, 255).astype(np.uint8)
    light_out[is_orange, 1] = np.clip(g[is_orange], 0, 255).astype(np.uint8)
    light_out[is_orange, 2] = np.clip(b[is_orange], 0, 255).astype(np.uint8)
    orange_alpha_l = np.clip(sat[is_orange] / 60 * 255, 80, 255)
    light_out[is_orange, 3] = orange_alpha_l.astype(np.uint8)
    
    light_result = Image.fromarray(light_out)
    r_ch, g_ch, b_ch, a_ch = light_result.split()
    a_ch = a_ch.filter(ImageFilter.GaussianBlur(radius=1.2))
    light_result = Image.merge('RGBA', (r_ch, g_ch, b_ch, a_ch))
    
    bbox = light_result.getbbox()
    if bbox:
        pad = 30
        left = max(0, bbox[0] - pad)
        upper = max(0, bbox[1] - pad)
        right = min(light_result.width, bbox[2] + pad)
        lower = min(light_result.height, bbox[3] + pad)
        light_result = light_result.crop((left, upper, right, lower))
    
    print(f'Light variant cropped: {light_result.size}')
    
    # ---- SAVE ALL SIZES ----
    def save_sizes(img, prefix):
        aspect = img.height / img.width
        
        # Full quality
        img.save(f'client/public/{prefix}_full.png', optimize=True)
        
        # Web size (for sidebar/login)
        web_w = 500
        web_h = int(web_w * aspect)
        web = img.resize((web_w, web_h), Image.LANCZOS)
        web.save(f'client/public/{prefix}.png', optimize=True)
        print(f'  {prefix}.png: {web_w}x{web_h}')
        
        return web
    
    dark_web = save_sizes(dark_result, 'logo-dark')
    light_web = save_sizes(light_result, 'logo-light')
    
    # Default logo = dark variant (app is primarily dark)
    dark_web.save('client/public/logo.png', optimize=True)
    print('  logo.png: default (dark variant)')
    
    # Favicon
    fav = dark_result.resize((48, 48), Image.LANCZOS)
    fav.save('client/public/favicon.ico', format='ICO', sizes=[(48, 48)])
    print('  favicon.ico: 48x48')
    
    print('\n✅ All logo variants processed successfully!')

if __name__ == '__main__':
    extract_and_process()
