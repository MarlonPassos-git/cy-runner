/* eslint-disable jest/expect-expect */
import {
  loginViaCookies,
  updateRetry,
  preserveCookie,
} from '../../support/common/support.js'
import { multiProduct } from '../../support/common/outputvalidation'
import { completePyamentWithDinersCard } from '../../support/adyen/testcase'
import { getTestVariables } from '../../support/common/testcase'

const { prefix, product1Name, product2Name, postalCode, productQuantity } =
  multiProduct

const { orderIdEnv } = getTestVariables(prefix)

describe('Multi Product Testcase', () => {
  loginViaCookies()

  it(`In ${prefix} - Adding Product to Cart`, updateRetry(3), () => {
    // Search the product
    cy.searchProduct(product1Name)
    // Add product to cart
    cy.addProduct(product1Name, { proceedtoCheckout: false })
    // Search the product
    cy.searchProduct(product2Name)
    // Add product to cart
    cy.addProduct(product2Name, {
      proceedtoCheckout: true,
    })
  })

  it(
    `In ${prefix} - Updating product quantity to ${productQuantity}`,
    updateRetry(3),
    () => {
      // Update Product quantity to 2
      cy.updateProductQuantity(product1Name, {
        quantity: productQuantity,
        verifySubTotal: false,
      })
    }
  )

  it(`In ${prefix} - Updating Shipping Information`, updateRetry(4), () => {
    // Update Shipping Section
    cy.updateShippingInformation({ postalCode })
  })

  completePyamentWithDinersCard(prefix, orderIdEnv)

  preserveCookie()
})
