<script>
  import {
    UIIcon
  } from "not-bulma";

  import {
    createEventDispatcher
  } from 'svelte';

  let dispatch = createEventDispatcher();

  export let moneySign = '&#8381;';
  export let data = {};

  function quantityChange(change) {
    data.quantity += change;
    dispatch('quantity.change', {
      id: data.id,
      change,
      quantity: data.quantity
    });
  }

  function quantityMinus() {
    quantityChange(-1);
  }

  function quantityPlus() {
    quantityChange(1);
  }

  function itemRemove() {
    dispatch('item.remove', {
      id: data.id
    });
  }

  function formatPrice(price) {
    let rub = parseInt(Math.floor(price / 100)),
      cop = parseInt(price % 100);
    rub = '' + rub;
    return `${moneySign}${rub}.${cop}`;
  }

  $: priceItem = formatPrice(parseFloat(data.item.price) * parseInt(data.quantity));
</script>

<div class="item columns mr-3 is-vcentered" data-id="{data.id}">
  <div class="column is-3 cart-item-title">
    <a href on:click|preventDefault={itemRemove} class="has-text-danger">
      <UIIcon font="times" />
    </a>
    &nbsp;
    <a href="{data.item.url}">{data.item.title}</a>
  </div>
  <div class="column image is-2 is-hidden-touch">
    <img src="{data.item.image.micro}" alt="{data.item.title}" />
  </div>
  <div class="column description is-3 is-hidden-touch">
    <span class="cart-item-description">{data.item.description}</span>
    {#each data.item.properties as item}
    <div class="cart-item-property">
      <span class="cart-item-property-title">{item.title}</span>
      <span class="cart-item-property-value">{item.value}</span>
    </div>
    {/each}
  </div>
  <div class="column quantity is-2">
    <a href on:click|preventDefault={quantityMinus} class="has-text-dark">
      <UIIcon font="minus" />
    </a>
    <span class="ml-1 mr-1">{data.quantity}</span>
    <a href on:click|preventDefault={quantityPlus} class="has-text-dark">
      <UIIcon font="plus" />
    </a>
  </div>
  <div class="column total-price is-2">{@html priceItem}</div>
</div>
