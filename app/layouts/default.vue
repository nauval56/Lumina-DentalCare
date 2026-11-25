<template>
  <div class="min-h-screen flex flex-col bg-[#EAF5F6] text-[#0B253A]">
    <CommonNavbar />
    <main class="flex-1">
      <slot />
    </main>
    <CommonFooter />
  </div>
</template>
