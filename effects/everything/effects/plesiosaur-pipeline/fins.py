import numpy as np, cv2
r=np.load('rot.npy')
# blade boxes (x0,x1,y0,y1), pivot, min radius from pivot
FL={'RU':((100,245,0,120),(178,132),28),
    'FU':((250,370,0,122),(322,140),24),
    'RD':((145,285,212,346),(192,208),26),
    'FD':((290,430,222,346),(345,220),24)}
def clean(v):
    m=(v>0.05).astype(np.uint8); k,lab,st,_=cv2.connectedComponentsWithStats(m,8)
    j=1+np.argmax(st[1:,4]); main=(lab==j).astype(np.uint8)
    near=cv2.dilate(main,np.ones((9,9),np.uint8)); keep=main.copy()
    for c in range(1,k):
        if c!=j and st[c,4]>=80 and near[lab==c].any(): keep[lab==c]=1
    return v*cv2.dilate(keep,np.ones((3,3),np.uint8))
def blade_mask(v,name):
    (x0,x1,y0,y1),(px,py),r0=FL[name]
    H,W=v.shape; yy,xx=np.mgrid[0:H,0:W]
    box=(xx>=x0)&(xx<x1)&(yy>=y0)&(yy<y1)&(np.hypot(xx-px,yy-py)>r0)
    return box&(v>0.05)
if __name__=='__main__':
    C=np.array([clean(v) for v in r]); np.save('rotc.npy',C)
    ang={n:[] for n in FL}
    for v in C:
        for n,(_,(px,py),_) in FL.items():
            m=blade_mask(v,n); ys,xs=np.where(m)
            ang[n].append(np.degrees(np.arctan2(ys.mean()-py, xs.mean()-px)))
    for n in FL:
        a=np.array(ang[n]); print(n,'mean',a.mean().round(1),'min',a.min().round(1),'max',a.max().round(1)); 
    np.save('angles.npy',np.array([ang[n] for n in FL]))
    print(np.array(ang['RU'])[::5].round(0)); print(np.array(ang['FD'])[::5].round(0))
