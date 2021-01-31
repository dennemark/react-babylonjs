import { Scene } from '@babylonjs/core';
import { CreatedInstance } from '../CreatedInstance';
import { LifecycleListener } from '../LifecycleListener';
import { applyInitialPropsToCreatedInstance } from '../UpdateInstance';

export default abstract class BaseLifecycleListener<T, U> implements LifecycleListener<T> {

  constructor(protected scene: Scene, protected props: U) {/* empty */}

  onParented(parent: CreatedInstance<any>, child: CreatedInstance<any>): void {
    if (child.customProps.assignFrom !== undefined) {
      if (parent.hostInstance[child.customProps.assignFrom] === undefined) {
        console.error(`Cannot find existing property ${child.customProps.assignFrom} on parent component (check your 'assignFrom')`)
      } else {
        // TODO: should we try to verify types like we do in 'fromInstance'?
        child.hostInstance = parent.hostInstance[child.customProps.assignFrom];
        if (child.deferredCreationProps && child.propsHandlers) {
          applyInitialPropsToCreatedInstance(child, child.deferredCreationProps);
        } else {
          console.warn('cannot assign deferred props.  they are lost.');
        }
        child.deferredCreationProps = undefined;
        }
    }
  }

  onChildAdded(child: CreatedInstance<any>, parent: CreatedInstance<any>): void { /* empty */};

  onMount(instance: CreatedInstance<T>): void { /* empty */};

  onUnmount(): void {/* empty */};
}