import { defineComponent, h, onMounted, onUnmounted, ref } from "vue"

export function createPopupComponent(start: (root: HTMLElement) => void | (() => void)) {
  return defineComponent({
    name: "ObsPlayingPopup",
    setup() {
      const root = ref<HTMLElement | null>(null)
      let stop: void | (() => void)
      onMounted(() => {
        if (root.value) stop = start(root.value)
      })
      onUnmounted(() => stop?.())
      return () => h("main", { ref: root, class: "popup" })
    },
  })
}
