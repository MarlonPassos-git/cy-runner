export function getSellers() {
  return {
    query:
      'query' +
      '{sellers @context(provider: "vtex.quickorder")' +
      '{items{id,name}}}',
    queryVariables: {},
  }
}

export function validateSellers(response) {
  expect(response.body.data.sellers.items).to.not.equal(null)
  expect(response.body.data.sellers.items).to.deep.include.members([
    {
      id: '1',
      name: 'VTEX',
    },
    {
      id: 'productusqa2',
      name: 'productusqa2',
    },
  ])
}

export function getSkuFromRefIds(orderFormId) {
  return {
    query:
      'query' +
      '($refids:[String],$orderFormId: String,$refIdSellerMap: RefIdSellerMap,$refIdQuantityMap: RefIdQuantityMap)' +
      '{skuFromRefIds(refids: $refids,refIdQuantityMap: $refIdQuantityMap,orderFormId:$orderFormId,refIdSellerMap:$refIdSellerMap)' +
      '{items{sku,refid,sellers{id,name,availability,unitMultiplier,availableQuantity}}}}',
    queryVariables: {
      refids: ['880320a'],
      orderFormId,
      refIdSellerMap: '{"880320a": 1}',
      refIdQuantityMap: {},
    },
  }
}

export function validateSkuFromRefIdsResponse(response) {
  expect(response.body.data.skuFromRefIds.items).to.not.equal(null)
  expect(response.body.data.skuFromRefIds.items).to.deep.include.members([
    {
      sku: '880320',
      refid: '880320a',
      sellers: [
        {
          id: '1',
          name: 'VTEX',
          availability: 'available',
          unitMultiplier: 1,
          availableQuantity: 1,
        },
      ],
    },
  ])
}
