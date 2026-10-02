import numpy as np, cv2
from fins import FL
C=np.load('rotc.npy'); A=np.load('angles.npy'); names=list(FL)
P=60; TARGET=48.0; GMIN,GMAX=1.8,3.2
n,H,W=C.shape
def smooth(a): return (np.roll(a,2)+2*np.roll(a,1)+3*a+2*np.roll(a,-1)+np.roll(a,-2))/9
def sstep(e0,e1,x): t=np.clip((x-e0)/(e1-e0),0,1); return t*t*(3-2*t)
gains={}
for j,nm in enumerate(names):
    a=smooth(A[j]); gains[nm]=float(np.clip(TARGET/((a.max()-a.min())/2),GMIN,GMAX))
print({k:round(v,2) for k,v in gains.items()})
Hp,Wp=H+2*P,W+2*P; yy,xx=np.mgrid[0:Hp,0:Wp].astype(np.float32)
out=[]; tips=[]
for i in range(n):
    v=np.pad(C[i],P); rest=v.copy(); acc=np.zeros_like(v); tip_i=[]
    for j,nm in enumerate(names):
        (x0,x1,y0,y1),(px,py),r0=FL[nm]; x0+=P;x1+=P;y0+=P;y1+=P; px+=P; py+=P
        a=smooth(A[j]); d=np.radians((gains[nm]-1)*(a[i]-a.mean()))
        rr=np.hypot(xx-px,yy-py)
        th=np.radians(a[i]); ang=np.arctan2(yy-py,xx-px)
        cone=np.abs(np.angle(np.exp(1j*(ang-th))))<np.radians(30)
        box=(xx>=x0)&(xx<x1)&(yy>=y0)&(yy<y1)&(v>0.05)
        blade=(box&cone&(rr>r0)).astype(np.uint8)
        k,lab,st,_=cv2.connectedComponentsWithStats(blade,8)
        if k>1: blade=(lab==1+np.argmax(st[1:,4]))
        root=box&cone&(rr>0.35*r0)&(rr<=r0)
        src_m=cv2.dilate((blade|root).astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)&(v>0.0)
        src=np.where(src_m,v,0).astype(np.float32)
        rest[cv2.dilate(blade.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)]=0   # root stays put too: no holes at the box edge
        # inverse map: output pixel at angle phi samples source at phi - delta(r)
        dl=d*sstep(0.35*r0,r0,rr); c,s=np.cos(-dl),np.sin(-dl)
        mx=(px+(xx-px)*c-(yy-py)*s).astype(np.float32); my=(py+(xx-px)*s+(yy-py)*c).astype(np.float32)
        rb=cv2.remap(src,mx,my,cv2.INTER_LINEAR,borderValue=0)
        acc=np.maximum(acc,rb)
        bm=(rb>0.05)&(rr>r0); ys,xs=np.where(bm); dd=np.hypot(xs-px,ys-py); t=np.argsort(dd)[-12:]
        tip_i.append((xs[t].mean(),ys[t].mean()))
    out.append(np.maximum(rest,acc)); tips.append(tip_i)
O=np.array(out); occ=(O>0.05).any(0); ys,xs=np.where(occ)
y0,y1,x0,x1=ys.min()-3,ys.max()+4,xs.min()-3,xs.max()+4
O=O[:,y0:y1,x0:x1]; T=np.array(tips)-np.array([x0,y0])
np.save('amp.npy',O); np.save('tips.npy',T); print(O.shape)
orig=np.pad(C,((0,0),(P,P),(P,P)))[:,y0:y1,x0:x1]
img=np.vstack([np.hstack([O[k],orig[k]]) for k in (0,8,15,23,30,45)])
cv2.imwrite('amp.png',(np.clip(img,0,1)*255).astype(np.uint8))
