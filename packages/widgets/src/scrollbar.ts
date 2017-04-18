/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, S. Chris Colbert
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
import {
  IDisposable
} from '@phosphor/disposable';

import {
  ElementExt
} from '@phosphor/domutils';

import {
  Drag
} from '@phosphor/dragdrop';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Widget
} from './widget';


/**
 * A widget which implements a canonical scroll bar.
 */
export
class ScrollBar extends Widget {
  /**
   * Construct a new scroll bar.
   *
   * @param options - The options for initializing the scroll bar.
   */
  constructor(options: ScrollBar.IOptions = {}) {
    super({ node: Private.createNode() });
    this.addClass('p-ScrollBar');
    this.setFlag(Widget.Flag.DisallowLayout);

    // Set the orientation.
    this._orientation = options.orientation || 'vertical';
    this.dataset['orientation'] = this._orientation;

    // Parse the rest of the options.
    if (options.maxValue !== undefined) {
      this._maxValue = Math.max(0, options.maxValue);
    }
    if (options.pageSize !== undefined) {
      this._pageSize = Math.max(0, options.pageSize);
    }
    if (options.value !== undefined) {
      this._value = Math.max(0, Math.min(options.value, this._maxValue));
    }
  }

  /**
   * A signal emitted when the user moves the scroll thumb.
   *
   * #### Notes
   * The payload is the current value of the scroll bar.
   */
  get thumbMoved(): ISignal<this, number> {
    return this._thumbMoved;
  }

  /**
   * A signal emitted when the user clicks a step button.
   *
   * #### Notes
   * The payload is whether a decrease or increase is requested.
   */
  get stepRequested(): ISignal<this, 'decrement' | 'increment'> {
    return this._stepRequested;
  }

  /**
   * A signal emitted when the user clicks the scroll track.
   *
   * #### Notes
   * The payload is whether a decrease or increase is requested.
   */
  get pageRequested(): ISignal<this, 'decrement' | 'increment'> {
    return this._pageRequested;
  }

  /**
   * Get the orientation of the scroll bar.
   */
  get orientation(): ScrollBar.Orientation {
    return this._orientation;
  }

  /**
   * Set the orientation of the scroll bar.
   */
  set orientation(value: ScrollBar.Orientation) {
    // Do nothing if the orientation does not change.
    if (this._orientation === value) {
      return;
    }

    // Release the mouse before making changes.
    this._releaseMouse();

    // Update the internal orientation.
    this._orientation = value;
    this.dataset['orientation'] = value;

    // Schedule an update the scroll bar.
    this.update();
  }

  /**
   * Get the current value of the scroll bar.
   */
  get value(): number {
    return this._value;
  }

  /**
   * Set the current value of the scroll bar.
   *
   * #### Notes
   * The value will be clamped to the range `[0, maxValue]`.
   */
  set value(value: number) {
    // Clamp the value to the allowable range.
    value = Math.max(0, Math.min(value, this._maxValue));

    // Do nothing if the value does not change.
    if (this._value === value) {
      return;
    }

    // Update the internal value.
    this._value = value;

    // Schedule an update the scroll bar.
    this.update();
  }

  /**
   * Get the maximum value of the scroll bar.
   */
  get maxValue(): number {
    return this._maxValue;
  }

  /**
   * Set the maximum value of the scroll bar.
   *
   * #### Notes
   * The max size will be clamped to the range `[0, Infinity]`.
   */
  set maxValue(value: number) {
    // Clamp the value to the allowable range.
    value = Math.max(0, value);

    // Do nothing if the value does not change.
    if (this._maxValue === value) {
      return;
    }

    // Update the internal values.
    this._maxValue = value;

    // Clamp the current value to the new range.
    this._value = Math.min(this._value, value);

    // Schedule an update the scroll bar.
    this.update();
  }

  /**
   * Get the page size of the scroll bar.
   *
   * #### Notes
   * The page size is the amount of visible content in the scrolled
   * region, expressed in data units. It determines the size of the
   * scroll bar thumb.
   */
  get pageSize(): number {
    return this._pageSize;
  }

  /**
   * Set the page size of the scroll bar.
   *
   * #### Notes
   * If the page size is `>= maxValue`, the scroll bar thumb will not
   * be displayed.
   *
   * The page size will be clamped to the range `[0, Infinity]`.
   */
  set pageSize(value: number) {
    // Clamp the page size to the allowable range.
    value = Math.max(0, value);

    // Do nothing if the value does not change.
    if (this._pageSize === value) {
      return;
    }

    // Update the internal page size.
    this._pageSize = value;

    // Schedule an update the scroll bar.
    this.update();
  }

  /**
   * The scroll bar decrement button node.
   *
   * #### Notes
   * Modifying this node directly can lead to undefined behavior.
   */
  get decrementNode(): HTMLDivElement {
    return this.node.getElementsByClassName('p-ScrollBar-button')[0] as HTMLDivElement;
  }

  /**
   * The scroll bar increment button node.
   *
   * #### Notes
   * Modifying this node directly can lead to undefined behavior.
   */
  get incrementNode(): HTMLDivElement {
    return this.node.getElementsByClassName('p-ScrollBar-button')[1] as HTMLDivElement;
  }

  /**
   * The scroll bar track node.
   *
   * #### Notes
   * Modifying this node directly can lead to undefined behavior.
   */
  get trackNode(): HTMLDivElement {
    return this.node.getElementsByClassName('p-ScrollBar-track')[0] as HTMLDivElement;
  }

  /**
   * The scroll bar thumb node.
   *
   * #### Notes
   * Modifying this node directly can lead to undefined behavior.
   */
  get thumbNode(): HTMLDivElement {
    return this.node.getElementsByClassName('p-ScrollBar-thumb')[0] as HTMLDivElement;
  }

  /**
   * Handle the DOM events for the scroll bar.
   *
   * @param event - The DOM event sent to the scroll bar.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the scroll bar's DOM node.
   *
   * This should not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'mousedown':
      this._evtMouseDown(event as MouseEvent);
      break;
    case 'mousemove':
      this._evtMouseMove(event as MouseEvent);
      break;
    case 'mouseup':
      this._evtMouseUp(event as MouseEvent);
      break;
    case 'keydown':
      this._evtKeyDown(event as KeyboardEvent);
      break;
    case 'contextmenu':
      event.preventDefault();
      event.stopPropagation();
      break;
    }
  }

  /**
   * A method invoked on a 'before-attach' message.
   */
  protected onBeforeAttach(msg: Message): void {
    this.node.addEventListener('mousedown', this);
    this.update();
  }

  /**
   * A method invoked on an 'after-detach' message.
   */
  protected onAfterDetach(msg: Message): void {
    this.node.removeEventListener('mousedown', this);
    this._releaseMouse();
  }

  /**
   * A method invoked on an 'update-request' message.
   */
  protected onUpdateRequest(msg: Message): void {
    // Fetch the thumb node.
    let thumbNode = this.thumbNode;

    // Update the visibility of the thumb node.
    if (this._pageSize >= this._maxValue) {
      thumbNode.classList.add('p-mod-hidden');
    } else {
      thumbNode.classList.remove('p-mod-hidden');
    }

    // Bail early if the thumb is hidden.
    if (this._pageSize >= this._maxValue) {
      return;
    }

    // Convert the value and page size into percentages.
    let value = this._value * 100 / this._maxValue;
    let pageSize = this._pageSize * 100 / this._maxValue;

    // Fetch the thumb style.
    let thumbStyle = thumbNode.style;

    // Update the thumb style for the current orientation.
    if (this._orientation === 'horizontal') {
      thumbStyle.top = '';
      thumbStyle.height = '';
      thumbStyle.left = `${value}%`;
      thumbStyle.width = `${pageSize}%`;
      thumbStyle.transform = `translate(${-value}%, 0%)`;
    } else {
      thumbStyle.left = '';
      thumbStyle.width = '';
      thumbStyle.top = `${value}%`;
      thumbStyle.height = `${pageSize}%`;
      thumbStyle.transform = `translate(0%, ${-value}%)`;
    }
  }

  /**
   * Handle the `'keydown'` event for the scroll bar.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    // Stop all input events during drag.
    event.preventDefault();
    event.stopPropagation();

    // Release the mouse if `Escape` is pressed.
    if (event.keyCode === 27) {
      this._releaseMouse();
    }
  }

  /**
   * Handle the `'mousedown'` event for the scroll bar.
   */
  private _evtMouseDown(event: MouseEvent): void {
    // Do nothing if it's not a left mouse press.
    if (event.button !== 0) {
      return;
    }

    // Do nothing if the mouse is already captured.
    if (this._pressData) {
      return;
    }

    // Do nothing if there is no scrollable content.
    if (this._pageSize >= this._maxValue) {
      return;
    }

    // Find the pressed scroll bar part.
    let part = Private.findPart(this, event.target as HTMLElement);

    // Do nothing if the part is not of interest.
    if (!part) {
      return;
    }

    // Stop the event propagation.
    event.preventDefault();
    event.stopPropagation();

    // Override the mouse cursor.
    let override = Drag.overrideCursor('default');

    // Set up the press data.
    this._pressData = {
      part, override, delta: -1,
      mouseX: event.clientX,
      mouseY: event.clientY
    };

    // Add the extra event listeners.
    document.addEventListener('mousemove', this, true);
    document.addEventListener('mouseup', this, true);
    document.addEventListener('keydown', this, true);
    document.addEventListener('contextmenu', this, true);

    // Handle a thumb press.
    if (part === 'thumb') {
      // Fetch the thumb node.
      let thumbNode = this.thumbNode;

      // Fetch the client rect for the thumb.
      let rect = thumbNode.getBoundingClientRect();

      // Update the press data delta for the current orientation.
      if (this._orientation === 'horizontal') {
        this._pressData.delta = event.clientX - rect.left;
      } else {
        this._pressData.delta = event.clientY - rect.top;
      }

      // Add the active class to the thumb node.
      thumbNode.classList.add('p-mod-active');

      // Finished.
      return;
    }

    // Handle a track press.
    if (part === 'track') {
      // Fetch the client rect for the thumb.
      let rect = this.thumbNode.getBoundingClientRect();

      // Determine the direction for the page request.
      let dir: 'decrement' | 'increment';
      if (this._orientation === 'horizontal') {
        dir = event.clientX < rect.left ? 'decrement' : 'increment';
      } else {
        dir = event.clientY < rect.top ? 'decrement' : 'increment';
      }

      // Start the repeat timer.
      this._repeatTimer = setTimeout(this._onRepeat, 350);

      // Emit the page requested signal.
      this._pageRequested.emit(dir);

      // Finished.
      return;
    }

    // Handle a decrement button press.
    if (part === 'decrement') {
      // Add the active class to the decrement node.
      this.decrementNode.classList.add('p-mod-active');

      // Start the repeat timer.
      this._repeatTimer = setTimeout(this._onRepeat, 350);

      // Emit the step requested signal.
      this._stepRequested.emit('decrement');

      // Finished.
      return;
    }

    // Handle an increment button press.
    if (part === 'increment') {

      // Add the active class to the increment node.
      this.incrementNode.classList.add('p-mod-active');

      // Start the repeat timer.
      this._repeatTimer = setTimeout(this._onRepeat, 350);

      // Emit the step requested signal.
      this._stepRequested.emit('increment');

      // Finished.
      return;
    }
  }

  /**
   * Handle the `'mousemove'` event for the scroll bar.
   */
  private _evtMouseMove(event: MouseEvent): void {
    // Do nothing if no drag is in progress.
    if (!this._pressData) {
      return;
    }

    // Stop the event propagation.
    event.preventDefault();
    event.stopPropagation();

    // Update the mouse position.
    this._pressData.mouseX = event.clientX;
    this._pressData.mouseY = event.clientY;

    // Bail if the thumb is hidden.
    if (this._pageSize >= this._maxValue) {
      return;
    }

    // Bail if the thumb is not being dragged.
    if (this._pressData.part !== 'thumb') {
      return;
    }

    // Get the client rect for the thumb and track.
    let thumbRect = this.thumbNode.getBoundingClientRect();
    let trackRect = this.trackNode.getBoundingClientRect();

    // Compute the desired value for the thumb.
    let value: number;
    if (this._orientation === 'horizontal') {
      let edge = event.clientX - trackRect.left - this._pressData.delta;
      value = edge * this._maxValue / (trackRect.width - thumbRect.width);
    } else {
      let edge = event.clientY - trackRect.top - this._pressData.delta;
      value = edge * this._maxValue / (trackRect.height - thumbRect.height);
    }

    // Clamp the value to the allowed range.
    value = Math.max(0, Math.min(value, this._maxValue));

    // Bail if the value does not change.
    if (this._value === value) {
      return;
    }

    // Update the internal value.
    this._value = value;

    // Schedule an update of the scroll bar.
    this.update();

    // Emit the thumb moved signal.
    this._thumbMoved.emit(value);
  }

  /**
   * Handle the `'mouseup'` event for the scroll bar.
   */
  private _evtMouseUp(event: MouseEvent): void {
    // Do nothing if it's not a left mouse release.
    if (event.button !== 0) {
      return;
    }

    // Stop the event propagation.
    event.preventDefault();
    event.stopPropagation();

    // Release the mouse.
    this._releaseMouse();
  }

  /**
   * Release the mouse and restore the node states.
   */
  private _releaseMouse(): void {
    // Bail if there is no press data.
    if (!this._pressData) {
      return;
    }

    // Clear the repeat timer.
    clearTimeout(this._repeatTimer);
    this._repeatTimer = -1;

    // Clear the press data.
    this._pressData.override.dispose();
    this._pressData = null;

    // Remove the extra event listeners.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    document.removeEventListener('keydown', this, true);
    document.removeEventListener('contextmenu', this, true);

    // Remove the active classes from the nodes.
    this.thumbNode.classList.remove('p-mod-active');
    this.decrementNode.classList.remove('p-mod-active');
    this.incrementNode.classList.remove('p-mod-active');
  }

  /**
   * A timeout callback for repeating the mouse press.
   */
  private _onRepeat = () => {
    // Clear the repeat timer id.
    this._repeatTimer = -1;

    // Bail if the mouse has been released.
    if (!this._pressData) {
      return;
    }

    // Look up the part that was pressed.
    let part = this._pressData.part;

    // Bail if the thumb was pressed.
    if (part === 'thumb') {
      return;
    }

    // Bail if there is no scrollable content.
    if (this._pageSize >= this._maxValue) {
      return;
    }

    // Schedule the timer for another repeat.
    this._repeatTimer = setTimeout(this._onRepeat, 20);

    // Get the current mouse position.
    let mouseX = this._pressData.mouseX;
    let mouseY = this._pressData.mouseY;

    // Handle a decrement button repeat.
    if (part === 'decrement') {
      // Bail if the mouse is not over the button.
      if (!ElementExt.hitTest(this.decrementNode, mouseX, mouseY)) {
        return;
      }

      // Emit the step requested signal.
      this._stepRequested.emit('decrement');

      // Finished.
      return;
    }

    // Handle an increment button repeat.
    if (part === 'increment') {
      // Bail if the mouse is not over the button.
      if (!ElementExt.hitTest(this.incrementNode, mouseX, mouseY)) {
        return;
      }

      // Emit the step requested signal.
      this._stepRequested.emit('increment');

      // Finished.
      return;
    }

    // Handle a track repeat.
    if (part === 'track') {
      // Bail if the mouse is not over the track.
      if (!ElementExt.hitTest(this.trackNode, mouseX, mouseY)) {
        return;
      }

      // Fetch the thumb node.
      let thumbNode = this.thumbNode;

      // Bail if the mouse is over the thumb.
      if (ElementExt.hitTest(thumbNode, mouseX, mouseY)) {
        return;
      }

      // Fetch the client rect for the thumb.
      let rect = thumbNode.getBoundingClientRect();

      // Determine the direction for the page request.
      let dir: 'decrement' | 'increment';
      if (this._orientation === 'horizontal') {
        dir = mouseX < rect.left ? 'decrement' : 'increment';
      } else {
        dir = mouseY < rect.top ? 'decrement' : 'increment';
      }

      // Emit the page requested signal.
      this._pageRequested.emit(dir);

      // Finished.
      return;
    }
  };

  private _value = 0;
  private _pageSize = 10;
  private _maxValue = 100;
  private _repeatTimer = -1;
  private _orientation: ScrollBar.Orientation;
  private _pressData: Private.IPressData | null = null;
  private _thumbMoved = new Signal<this, number>(this);
  private _stepRequested = new Signal<this, 'decrement' | 'increment'>(this);
  private _pageRequested = new Signal<this, 'decrement' | 'increment'>(this);
}


/**
 * The namespace for the `ScrollBar` class statics.
 */
export
namespace ScrollBar {
  /**
   * A type alias for a scroll bar orientation.
   */
  export
  type Orientation = 'horizontal' | 'vertical';

  /**
   * An options object for creating a scroll bar.
   */
  export
  interface IOptions {
    /**
     * The orientation of the scroll bar.
     *
     * The default is `'vertical'`.
     */
    orientation?: Orientation;

    /**
     * The value for the scroll bar.
     *
     * The default is `0`.
     */
    value?: number;

    /**
     * The maximum value for the scroll bar.
     *
     * The default is `100`.
     */
    maxValue?: number;

    /**
     * The page size for the scroll bar.
     *
     * The default is `10`.
     */
    pageSize?: number;
  }
}


/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * A type alias for the parts of a scroll bar.
   */
  export
  type ScrollBarPart = 'thumb' | 'track' | 'decrement' | 'increment';

  /**
   * An object which holds mouse press data.
   */
  export
  interface IPressData {
    /**
     * The scroll bar part which was pressed.
     */
    part: ScrollBarPart;

    /**
     * The offset of the press in thumb coordinates, or -1.
     */
    delta: number;

    /**
     * The disposable which will clear the override cursor.
     */
    override: IDisposable;

    /**
     * The current X position of the mouse.
     */
    mouseX: number;

    /**
     * The current Y position of the mouse.
     */
    mouseY: number;
  }

  /**
   * Create the DOM node for a scroll bar.
   */
  export
  function createNode(): HTMLElement {
    let node = document.createElement('div');
    let decrement = document.createElement('div');
    let increment = document.createElement('div');
    let track = document.createElement('div');
    let thumb = document.createElement('div');
    decrement.className = 'p-ScrollBar-button';
    increment.className = 'p-ScrollBar-button';
    decrement.dataset['action'] = 'decrement';
    increment.dataset['action'] = 'increment';
    track.className = 'p-ScrollBar-track';
    thumb.className = 'p-ScrollBar-thumb';
    track.appendChild(thumb);
    node.appendChild(decrement);
    node.appendChild(track);
    node.appendChild(increment);
    return node;
  }

  /**
   * Find the scroll bar part which contains the given target.
   */
  export
  function findPart(scrollBar: ScrollBar, target: HTMLElement): ScrollBarPart | null {
    // Test the thumb.
    if (scrollBar.thumbNode.contains(target)) {
      return 'thumb';
    }

    // Test the track.
    if (scrollBar.trackNode.contains(target)) {
      return 'track';
    }

    // Test the decrement button.
    if (scrollBar.decrementNode.contains(target)) {
      return 'decrement';
    }

    // Test the increment button.
    if (scrollBar.incrementNode.contains(target)) {
      return 'increment';
    }

    // Indicate no match.
    return null;
  }
}
