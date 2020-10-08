<script>
  import {UIButton} from "not-bulma";
  import { createEventDispatcher } from 'svelte';
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

<div class="item columns" data-id="{data.id}">
  <div class="column is-1 buttons item-remove-btn">
    <UIButton action="{itemRemove}" icon="times-circle"></UIButton>
  </div>
  <div class="column is-3 cart-item-title"><a href="{data.item.url}">{data.item.title}</a></div>
  <div class="column image is-2">
    <img src="{data.item.image}" alt="{data.item.title}" />
  </div>
  <div class="column description is-3">
    <span class="cart-item-description">{data.item.description}</span>
    {#each data.item.properties as item}
    <div class="cart-item-property">
      <span class="cart-item-property-title">{item.title}</span>
      <span class="cart-item-property-value">{item.value}</span>
    </div>
    {/each}
  </div>
  <div class="column quantity is-2">
    <UIButton action="{quantityMinus}" classes="minus-btn" icon="minus"></UIButton>
    <span class="number ml-1 mr-1">{data.quantity}</span>
    <UIButton action="{quantityPlus}" classes="plus-btn" icon="plus"></UIButton>
  </div>
  <div class="column total-price is-1">{@html priceItem}</div>
</div>


<style>

  :root {
    --color-primary: #4a90e2;
    --color-secondary: #e2844a;
    --color-disabled: #ccc;
    --font-primary: sans-serif;
    --text-base-size: 1em;
    --text-scale-ratio: 1.2;
    --text-xs: calc(1em/var(--text-scale-ratio)/var(--text-scale-ratio));
    --text-sm: calc(var(--text-xs)*var(--text-scale-ratio));
    --text-md: calc(var(--text-sm)*var(--text-scale-ratio)*var(--text-scale-ratio));
    --text-lg: calc(var(--text-md)*var(--text-scale-ratio));
    --text-xl: calc(var(--text-lg)*var(--text-scale-ratio));
    --text-xxl: calc(var(--text-xl)*var(--text-scale-ratio));
    --text-xxxl: calc(var(--text-xxl)*var(--text-scale-ratio));
    --body-line-height: 1.4;
    --heading-line-height: 1.2;
    --font-primary-capital-letter: 1;
  }

  .item {
    padding: 20 px 30 px;
    display: flex;
    border-bottom: 1px solid #E1E8EE;
  }

  .image {
    margin-right: 50px;
    width: 5em;
    height: 5em;
    overflow: hidden;
    text-align: center;
  }

  .image img{
    max-width: 5em;
    max-height: 5em;
  }


  .cart-item-title {
    margin-top: 1em;
    display: flex;
    min-width: 135px;
    width: 30%;
  }

  .cart-item-title a, .cart-item-title a:visited {
    color: var(--color-primary);
    text-decoration: none;
  }

  .description {
    padding-top: 10px;
    margin-right: 60px;
    min-width: 155px;
    margin-top: 1em;
    margin-bottom: 1em;
  }

  .description .cart-item-property .cart-item-property-title {
    display: inline-block;
    font-size: var(--text-base-size);
    color: var(--color-primary);
    font-weight: 400;
  }

  .description .cart-item-property .cart-item-property-value {
    font-weight: 300;
    display: inline-block;
    color: var(--color-secondary);
  }


  .quantity {
    display: flex;
    justify-content: center;
    align-content: center;
    min-width: calc(var(--text-base-size)*var(--text-scale-ratio)*6);
  }

  .quantity > span {
    -webkit-appearance: none;
    display:inline-block;
    text-align: center;
    font-size: calc(var(--text-base-size)*var(--text-scale-ratio));
  }

  .quantity .number{
    line-height: calc(var(--text-base-size)*var(--text-scale-ratio));
    padding-top: calc(var(--text-base-size)*var(--text-scale-ratio) / 2);
  }

  .quantity > *{
    height: calc(var(--text-base-size)*var(--text-scale-ratio)*2);
    width: calc(var(--text-base-size)*var(--text-scale-ratio)*2);
  }


  .total-price {
    width: 83px;
    text-align: center;
    font-size: var(--text-base-size);
    color: #4a90e2;
    font-weight: 300;
  }

  .cart-list .total-price {
    padding-top: 0px;
    margin-left: auto;
    font-size: var(--text-base-size);
  }

</style>
