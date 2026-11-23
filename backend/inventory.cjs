function normalizeQuantityState(item = {}) {
  const quantityTracked = item.quantityTracked === true
  const quantity = Number(item.quantity)

  return {
    quantityTracked,
    quantity:
      quantityTracked && Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
  }
}

function getConsumptionType(item = {}) {
  const state = normalizeQuantityState(item)
  return state.quantityTracked && state.quantity > 1 ? 'decrease' : 'remove'
}

function getQuantityAfterConsumption(item = {}) {
  const state = normalizeQuantityState(item)
  return getConsumptionType(state) === 'decrease' ? state.quantity - 1 : 0
}

module.exports = {
  getConsumptionType,
  getQuantityAfterConsumption,
  normalizeQuantityState,
}
