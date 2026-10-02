import numpy as np, cv2
a=np.memmap('frames.raw',np.uint8,'r').reshape(-1,832,464,3)
M=np.load('isnet_all.npy',mmap_mode='r')
Tb=np.load('../ples/T.npy')  # background camera transforms (frame -> frame0)
S,P,DX,DY=183,60,-2,-8
H,W=832,464
def cam(i):
    # map frame-S coordinates to frame-i coordinates using background transforms
    A=np.vstack([Tb[S],[0,0,1]]); B=np.vstack([Tb[i],[0,0,1]])
    return (np.linalg.inv(B)@A)[:2]
excl_S=[np.array([[378,440],[400,420],[470,412],[470,490],[378,482]],np.float32),   # power brick
        np.array([[372,482],[470,482],[470,600],[390,600]],np.float32),               # cables below it
        np.array([[410,0],[470,0],[470,365],[410,365]],np.float32),                   # ladder leg
        np.array([[386,297],[412,297],[412,316],[386,316]],np.float32),               # ladder rung by the head
        np.array([[0,0],[470,0],[470,8],[235,280],[0,420]],np.float32)]               # ladder beam and above
def clean(i):
    alpha=np.clip((M[i].astype(np.float32)-60)/140,0,1)
    hard=(M[i]>128).astype(np.uint8)
    C=cam(i); ex=np.zeros((H,W),np.uint8)
    for poly in excl_S:
        p=cv2.transform(poly[None],C)[0]; cv2.fillPoly(ex,[p.astype(np.int32)],1)
    ex[:257]=1; ex[:495,:120]=1; ex[:305,322:348]=1      # ladder above the head, bag/ladder left of the body (frame coords)
    hard[ex>0]=0
    k,lab,st,_=cv2.connectedComponentsWithStats(hard,8)
    sx,sy=cv2.transform(np.float32([[[200,500]]]),C)[0,0]
    disc=np.zeros((H,W),np.uint8); cv2.circle(disc,(int(sx),int(sy)),35,1,-1)
    cnt=np.bincount(lab[disc>0],minlength=k); cnt[0]=0
    j=int(np.argmax(cnt)); main=(lab==j).astype(np.uint8)
    near=cv2.dilate(main,np.ones((31,31),np.uint8))
    keep=main.copy()
    for c in range(1,k):
        if c!=j and st[c,4]>=30 and st[c,4]<st[j,4]*0.2 and near[lab==c].any(): keep[lab==c]=1
    keep=cv2.dilate(keep,np.ones((3,3),np.uint8))
    return alpha*keep*(1-ex)
def value(i):
    f=a[i].astype(np.float32); L=cv2.cvtColor(a[i],cv2.COLOR_BGR2GRAY).astype(np.float32)
    m=clean(i)
    cl=cv2.createCLAHE(clipLimit=3.0,tileGridSize=(8,8)).apply(L.astype(np.uint8)).astype(np.float32)
    det=cl-cv2.GaussianBlur(cl,(0,0),4)                 # local detail: rings, struts, joints
    base=np.clip((cl-20)/170,0,1)
    v=0.42+0.5*base+0.9*np.clip(det/60,-0.25,0.5)
    hard=(m>0.5).astype(np.uint8)
    edge=(hard-cv2.erode(hard,np.ones((3,3),np.uint8))).astype(np.float32)
    v=np.maximum(v,0.62*edge)                           # keep the silhouette readable
    return np.clip(v,0.34,1)*m
if __name__=='__main__':
    vals=[]
    for k in range(P):
        i=S+k; v=value(i)
        sh=np.float32([[1,0,DX*k/P],[0,1,DY*k/P]])
        vals.append(cv2.warpAffine(v,sh,(W,H),flags=cv2.INTER_LINEAR))
    V=np.array(vals); np.save('vals.npy',V)
    occ=(V>0.05).any(0); ys,xs=np.where(occ); print('bbox',xs.min(),xs.max(),ys.min(),ys.max())
