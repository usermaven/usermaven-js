/**
 * Scroll extension to add scroll get scroll depth in percentage
 */

import {UsermavenClient} from "../interface"
import {_extend} from "../utils";


export default class ScrollDepth {
  instance: UsermavenClient
  enabled: boolean
  lastScrollDepth: number

  constructor(instance: UsermavenClient, enabled = true) {
    this.instance = instance
    this.enabled = enabled
    this.lastScrollDepth = 0
  }

  scroll(type = 'scroll') {
    if (!this.enabled) {
      return
    }

    const scrollDepth = this.getScrollDepth()

    if (scrollDepth > this.lastScrollDepth) {
      this.lastScrollDepth = scrollDepth
      const props = _extend({
        $event_type:  type,
        $ce_version: 1,
      }, {
        percent: scrollDepth,
      })

      this.instance.capture('$scroll', props)
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
