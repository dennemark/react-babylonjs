# React BabylonJS

> 'react-babylonjs' 3.x has many breaking changes to advance the API decided to do them all at once in a major version.

## hostInstance not public
**BEFORE:**
```jsx
conse boxRef = useRef();
if (boxRef.current) {
  const mesh = boxRef.current.hostInstance;
}
...
<box ref={boxRef} .../>
```

**AFTER:** Now is directly accessible
```jsx
conse boxRef = useRef();
if (boxRef.current) {
  const mesh = boxRef.current;
}
...
<box ref={boxRef} .../>
```


## model -> Model
`model` intrinsic host element has been removed in favour of a `Model` component (notice the lower case vs. proper case), which needs to be enclosed in `React.Suspense` Component.
**BEFORE:**
```jsx
import { Scene } from 'react-babylonjs';
...
<Engine>
  <Scene>
    <model ... />
  </Scene>
</Engine>
```

**AFTER:** Now needs to be enclosed in Suspense.  Additionally, the `onModelLoaded` signature doesn't include a SceneContext, but you can get scene from any `mesh._scene`.
```jsx
import React, {Suspense} from 'react';
import { Engine, Scene } from 'react-babylonjs';

...
<Engine>
  <Scene>
    <Suspense fallback={<Spinner />}>
      <Model ... />
    </Suspense>
  </Scene>
</Engine>
```

## Hooks renamed `useBabylonScene` -> `useScene`, `useBabylonEngine` -> `useEngine` & `useBabylonCanvas` --> `useCanvas`
Hook to get scene, engine and canvas objects now have simpler names.

**BEFORE:**
```jsx
import { useBabylonScene, useBabylonEngine, useBabylonCanvas } from 'react-babylonjs';
...
```

**AFTER:** different names
```jsx
import { useScene, useEngine, useCanvas } from 'react-babylonjs';
...
```

# `fromInstance` declared objects to not automatically dispose, but you can opt-in.
Typical scenario when using `fromInstance` is that you would want to re-use the mesh multiple times.  If you load a texture then you would expect it to be re-used when you pass it `fromInstance`.  That may not be the case often with meshes, so you need to declare disposing.  This is a breaking change in that if you were expecting that behaviour that the object would no longer be disposed.
**BEFORE:**
```jsx
import { Vector3, Color3, MeshBuilder } from '@babylonjs/core'

const [mesh, setMesh] = useState(null);
const scene = useScene();
useMemo(() => {
  console.log('creating a box with scene', scene);
  setMesh(MeshBuilder.CreateBox('test', { size: 1 }, scene));
}, []);

return (
  <>
    {mesh &&
      <mesh name='box' fromInstance={mesh} rotation={props.rotation} disposeInstanceOnUnmount>
        <standardMaterial name='boxmat' diffuseColor={Color3.Blue()} specularColor={Color3.Black()} />
      </mesh>
    }
  </>
)
```

**AFTER:** Must include `disposeInstanceOnUnmount` to work as before.  We need to explicitly declare our intention when we hand off an instance.
```jsx
import { Vector3, Color3, MeshBuilder } from '@babylonjs/core'

const [mesh, setMesh] = useState(null);
const scene = useScene();
useMemo(() => {
  console.log('creating a box with scene', scene);
  setMesh(MeshBuilder.CreateBox('test', { size: 1 }, scene));
}, []);

return (
  <>
    {mesh &&
      <mesh name='box' fromInstance={mesh} rotation={props.rotation} disposeInstanceOnUnmount>
        <standardMaterial name='boxmat' diffuseColor={Color3.Blue()} specularColor={Color3.Black()} />
      </mesh>
    }
  </>
)
```

If you find something else that changed for the migration, please add a PR or create an issue.  Thanks.
