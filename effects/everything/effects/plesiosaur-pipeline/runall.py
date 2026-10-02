import numpy as np, sys
from seg import isnet
a=np.memmap('frames.raw',np.uint8,'r').reshape(-1,832,464,3)
n=a.shape[0]
out=np.lib.format.open_memmap('isnet_all.npy',mode='w+',dtype=np.uint8,shape=(n,832,464))
for i in range(n):
    out[i]=(isnet(np.ascontiguousarray(a[i]))*255).astype(np.uint8)
    if i%20==0: print(i,flush=True)
out.flush(); print('done',flush=True)
