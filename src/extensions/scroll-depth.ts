/**
 * Scroll extension to add scroll get scroll depth in percentage
 */

import {UsermavenClient} from "../interface"
import {_extend} from "../utils";

const THROTTLE_INTERVAL = 0

export default class ScrollDepth {
  instance: UsermavenClient
  enabled: boolean
  lastScrollDepth: number
  lastEventTime: number

  constructor(instance: UsermavenClient, enabled = true) {
    this.instance = instance
    this.enabled = enabled
    this.lastScrollDepth = 0
    this.lastEventTime = 0
  }

  scroll() {
    if (!this.enabled) {
      return
    }

    const scrollDepth = this.getScrollDepth()
    const now = Date.now()

    if (scrollDepth > this.lastScrollDepth) {
      this.lastScrollDepth = scrollDepth

      // to prevent massive data collection, we only capture every 100ms
      if (now - this.lastEventTime > THROTTLE_INTERVAL ) {
        this.lastEventTime = now
      } else {
        return
      }

      const props = _extend({
        $event_type: 'scroll',
        $ce_version: 1,
      }, {
        scroll_depth: scrollDepth,
      })

      this.instance.capture('$autocapture', props)

    }
  }

  getScrollDepth() {
    const [x, y] = this.getScrollXY()

    return Math.round((y / (document.body.scrollHeight - window.innerHeight)) * 100)
  }

  getScrollXY() {
    const x = window.scrollX
    const y = window.scrollY
    return [x, y]
  }
}
