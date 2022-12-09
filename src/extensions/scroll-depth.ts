/**
 * Scroll extension to add scroll get scroll depth in percentage
 */

import {UsermavenClient} from "../interface"
import {_extend} from "../utils";


export default class ScrollDepth {
  instance: UsermavenClient
  lastScrollDepth: number
  canSend: boolean

  constructor(instance: UsermavenClient) {
    this.instance = instance
    this.lastScrollDepth = 0
    this.canSend = true
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

    if (!this.canSend) {
      return;
    }

    // Creating payload
    const props = {
      percent: this.lastScrollDepth,
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
      let winHeight = window.innerHeight;
      let docHeight = document.body.scrollHeight;

      // Get the current scroll position and the length of the track
      let scrollTop = window.scrollY;
      let trackLength = docHeight - winHeight;

      // Calculate the scroll depth as a percentage
      return Math.floor(scrollTop / trackLength * 100);

    } catch (e) {
      return 0
    }

  }
}
