from PIL import Image, ImageDraw, ImageFont
S=512;im=Image.new("RGB",(S,S),(17,18,18));d=ImageDraw.Draw(im)
Y=(240,196,60)
# barbell
d.rounded_rectangle((96,236,416,276),radius=8,fill=Y)
for x,h in [(120,150),(160,200),(352,200),(392,150)]:
    d.rounded_rectangle((x-18,256-h//2,x+18,256+h//2),radius=10,fill=Y)
try: f=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",88)
except: f=ImageFont.load_default()
t="3×";w=d.textlength(t,font=f);d.text(((S-w)/2,370),t,font=f,fill=(236,235,230))
im.save("icon.png",optimize=True)
