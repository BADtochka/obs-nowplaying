<template>
  <main
    class="grid h-dvh min-w-0 grid-cols-[3.875rem_minmax(0,1fr)] overflow-hidden bg-background text-foreground md:grid-cols-[13.75rem_minmax(0,1fr)]"
  >
    <slot name="sidebar" />
    <section class="min-w-0 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 md:px-8 lg:px-12">
      <slot />
    </section>
  </main>
</template>
