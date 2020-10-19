<script>
  export let count = 0;
  export let show = true;
  import {
    createEventDispatcher
  } from 'svelte';
  let dispatch = createEventDispatcher();

  function dispatchClick() {
    dispatch('click', {});
  }
</script>
{#if show}
<div>
  <a href class="cart-icon-fixed" on:click={dispatchClick}>
    <span class="cart-icon-count">{count}</span>
  </a>
</div>
{/if}
