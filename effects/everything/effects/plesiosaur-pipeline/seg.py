import numpy as np, cv2, onnxruntime as ort, time
sess=ort.InferenceSession('isnet.onnx',providers=['CPUExecutionProvider'])
inp=sess.get_inputs()[0].name
def isnet(bgr):
    h,w=bgr.shape[:2]
    im=cv2.resize(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB),(1024,1024),interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    im=im/max(im.max(),1e-6); im=(im-0.5)/1.0
    x=im.transpose(2,0,1)[None]
    o=sess.run(None,{inp:x})[0][0,0]
    o=(o-o.min())/(o.max()-o.min()+1e-6)
    return cv2.resize(o,(w,h),interpolation=cv2.INTER_LINEAR)
if __name__=='__main__':
    a=np.memmap('frames.raw',np.uint8,'r').reshape(-1,832,464,3)
    f=np.ascontiguousarray(a[150]); t=time.time()
    m=isnet(f[150:780]); print(time.time()-t)
    vis=f.copy(); full=np.zeros((832,464),np.float32); full[150:780]=m
    vis=(vis*0.35 + np.dstack([full*255]*3)*0.65).astype(np.uint8)
    cv2.imwrite('isnet150.png',np.hstack([f,vis]))
