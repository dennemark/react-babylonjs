import React, { useContext, useEffect, useRef, useState, MutableRefObject } from 'react';
import {
  AbstractMesh,
  Nullable,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Scene as BabylonJSScene,
  SceneOptions
} from '@babylonjs/core';

import { EngineCanvasContextType, EngineCanvasContext, withEngineCanvasContext } from './hooks/engine';
import { SceneContext } from './hooks/scene';
import { applyUpdateToInstance } from "./UpdateInstance";
import { createReconciler, ReconcilerInstance } from './render';
import { FiberScenePropsHandler } from './generatedCode';
import { FiberSceneProps } from './generatedProps';
import { UpdatePayload } from './PropsHandler';
import { Container } from './ReactBabylonJSHostConfig';

export declare type SceneEventArgs = {
  scene: BabylonJSScene;
  canvas: HTMLCanvasElement;
};

type SceneProps = {
  engineCanvasContext: EngineCanvasContextType
  onMeshPicked?: (mesh: AbstractMesh, scene: BabylonJSScene) => void
  onScenePointerDown?: (evt: PointerInfo, scene: BabylonJSScene) => void
  onScenePointerUp?: (evt: PointerInfo, scene: BabylonJSScene) => void
  onScenePointerMove?: (evt: PointerInfo, scene: BabylonJSScene) => void
  onSceneMount?: (sceneEventArgs: SceneEventArgs) => void
  children: any,
  sceneOptions?: SceneOptions
} & FiberSceneProps

const updateScene = (props: SceneProps, prevPropsRef: MutableRefObject<Partial<SceneProps>>, scene: BabylonJSScene, propsHandler: FiberScenePropsHandler) => {
  const prevProps = prevPropsRef.current;
  const updates: UpdatePayload = propsHandler.getPropertyUpdates(prevProps, props);

  if (updates !== null) {
    updates.forEach(propertyUpdate => {
      applyUpdateToInstance(scene, propertyUpdate);
    })
  }
  prevPropsRef.current = props;
}

const Scene: React.FC<SceneProps> = (props: SceneProps, context?: any) => {
  const { engine } = useContext(EngineCanvasContext)

  const [propsHandler] = useState(new FiberScenePropsHandler());
  const [sceneReady, setSceneReady] = useState(false);
  const [scene, setScene] = useState<Nullable<BabylonJSScene>>(null)

  // TODO: make this strongly typed
  const reconcilerRef = useRef<Nullable<ReconcilerInstance>>(null);
  const containerRef = useRef<Container | null>(null);

  const prevPropsRef: MutableRefObject<Partial<SceneProps>> = useRef<Partial<SceneProps>>({});

  // initialize babylon scene
  useEffect(() => {
    const scene = new BabylonJSScene(engine!, props.sceneOptions)
    // const onReadyObservable: Nullable<Observer<BabylonJSScene>> = scene.onReadyObservable.add(onSceneReady);
    const sceneIsReady = scene.isReady();
    if (sceneIsReady) {
      // scene.onReadyObservable.remove(onReadyObservable);
      setSceneReady(true); // this does not flow and cause a re-render
    } else {
      console.error('Scene is not ready. Report issue in react-babylonjs repo')
    }

    setScene(scene);
    updateScene(props, prevPropsRef, scene, propsHandler);

    // TODO: try to move the scene to parentComponent in updateContainer
    const container: Container = {
      scene: scene,
      rootInstance: {
        hostInstance: null,
        children: [],
        parent: null,
        metadata: {
          className: "root"
        },
        customProps: {}
      }
    };

    containerRef.current = container;

    const reconciler = createReconciler({});
    reconcilerRef.current = reconciler;

    const pointerDownObservable: Nullable<Observer<PointerInfo>> = scene.onPointerObservable.add(
      (evt: PointerInfo) => {
        if (typeof props.onScenePointerDown === 'function') {
          props.onScenePointerDown(evt, scene);
        }

        if (evt && evt.pickInfo && evt.pickInfo.hit && evt.pickInfo.pickedMesh) {
          let mesh = evt.pickInfo.pickedMesh;
          if (typeof props.onMeshPicked === 'function') {
            props.onMeshPicked(mesh, scene);
          } else {
            // console.log('onMeshPicked not being called')
          }
        }
      },
      PointerEventTypes.POINTERDOWN
    );

    // can only be assigned on init
    let pointerUpObservable: Nullable<Observer<PointerInfo>> = null;
    if (typeof props.onScenePointerUp === 'function') {
      pointerUpObservable = scene.onPointerObservable.add(
        (evt: PointerInfo) => {
          props.onScenePointerUp!(evt, scene)
        },
        PointerEventTypes.POINTERUP
      );
    }

    // can only be assigned on init
    let pointerMoveObservable: Nullable<Observer<PointerInfo>> = null;
    if (typeof props.onScenePointerMove === 'function') {
      pointerMoveObservable = scene.onPointerObservable.add(
        (evt: PointerInfo) => {
          props.onScenePointerMove!(evt, scene);
        },
        PointerEventTypes.POINTERMOVE
      );
    }

    if (typeof props.onSceneMount === 'function') {
      props.onSceneMount({
        scene: scene,
        canvas: scene.getEngine().getRenderingCanvas()!
      });
      // TODO: console.error if canvas is not attached. runRenderLoop() is expected to be part of onSceneMount().
    }

    // TODO: change enable physics to 'usePhysics' taking an object with a Vector3 and 'any'.
    // NOTE: must be enabled for updating container (cannot add impostors w/o physics enabled)
    if (Array.isArray(props.enablePhysics)) {
      scene.enablePhysics(props.enablePhysics[0], props.enablePhysics[1]);
    }

    const sceneGraph = (
      <SceneContext.Provider value={{
        scene,
        sceneReady: sceneIsReady
      }}>
        {props.children}
      </SceneContext.Provider>
    )
    reconciler.render(sceneGraph, container, () => { /* empty for now */ }, null)

    return () => {
      if (pointerDownObservable) {
        scene.onPointerObservable.remove(pointerDownObservable);
      }

      if (pointerUpObservable) {
        scene.onPointerObservable.remove(pointerUpObservable);
      }

      if (pointerMoveObservable) {
        scene.onPointerObservable.remove(pointerMoveObservable);
      }

      if (scene.isDisposed === false) {
        scene.dispose();
      }

      // clear renderer element
      reconciler.render(null, containerRef.current!, () => { /* empty */ }, null);
      reconcilerRef.current = null;
      containerRef.current = null;
    }
  },
    [/* no deps, so called only on un/mount */]
  );

  // update babylon scene
  useEffect(() => {
    if (engine === null || scene === null || reconcilerRef.current === null) {
      return;
    }

    updateScene(props, prevPropsRef, scene, propsHandler);

    const sceneGraph = (
      <SceneContext.Provider value={{
        scene,
        sceneReady
      }}>
        {props.children}
      </SceneContext.Provider>
    )
    reconcilerRef.current!.render(sceneGraph, containerRef.current!, () => { /* ignored */}, null);
  });

  return null;
};

export default withEngineCanvasContext(Scene);
