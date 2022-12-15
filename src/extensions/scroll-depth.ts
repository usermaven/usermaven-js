/**
 * Scroll extension to add scroll get scroll depth in percentage
 */

import {UsermavenClient} from "../interface"

export default class ScrollDepth {
  instance: UsermavenClient
  lastScrollDepth: number
  canSend: boolean
  documentElement: HTMLElement

  constructor(instance: UsermavenClient) {
    this.instance = instance
    this.lastScrollDepth = 0
    this.canSend = true
    this.documentElement = document.documentElement
  }

  /**
   * Track scroll depth
   * @description this function will be called on every scroll event to track scroll depth
   */
  track() {

    const scrollDepth = this.getScrollDepth()

    // If scroll depth is greater than last scroll depth, then update last scroll depth
    // We are doing this to only get the maximum scroll depth
    if (scrollDepth > this.lastScrollDepth) {
      this.lastScrollDepth = scrollDepth
      this.canSend = true
    }
  }

  /**
   * Send scroll depth event
   * @description this function will be when we want to send scroll depth event e.g. on page visibility change
   */
  send(eventType = "$scroll") {

    if (!this.canSend || !this.lastScrollDepth) {
      return;
    }

    // Creating payload
    const props = {
      percent: this.lastScrollDepth,
      window_height: this.getWindowHeight(),
      document_height: this.getDocumentHeight(),
      scroll_distance: this.getScrollDistance()
    };

    // Sending event
    this.instance.capture(eventType, props)

    // Setting canSend to false, for avoiding sending multiple events
    this.canSend = false
  }

  /**
   * Core method to get scroll depth
   */
  getScrollDepth() {
    try {
      // Get the height of the window and the document body
      let winHeight = this.getWindowHeight()
      let docHeight = this.getDocumentHeight();

      // Get the current scroll position and the length of the track
      let scrollTop = this.getScrollDistance()
      let trackLength = docHeight - winHeight;

      // Calculate the scroll depth as a percentage
      return Math.floor(scrollTop / trackLength * 100);

    } catch (e) {
      return 0
    }
  }

  /**
   * Core method to get window height
   */
  getWindowHeight() {
    try {
      return window.innerHeight || this.documentElement.clientHeight ||
        document.body.clientHeight || 0;
    } catch (e) {
      return 0
    }
  }

  /**
   * Core method to get document height
   */
  getDocumentHeight() {
    try {
      return Math.max(
        document.body.scrollHeight || 0, this.documentElement.scrollHeight || 0,
        document.body.offsetHeight || 0, this.documentElement.offsetHeight || 0,
        document.body.clientHeight || 0, this.documentElement.clientHeight || 0
      );
    } catch (e) {
      return 0
    }
  }

  /**
   * Core method to get scroll distance
   */
  getScrollDistance() {
    try {
      return window.scrollY || window.pageYOffset || document.body.scrollTop ||
        this.documentElement.scrollTop || 0;
    } catch (e) {
      return 0
    }
  }
}
