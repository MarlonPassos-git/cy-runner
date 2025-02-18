/* eslint-disable jest/expect-expect */
import { completePyamentWithDinersCard } from '../../support/adyen/testcase'
import { singleProduct } from '../../support/common/outputvalidation'
import {
  loginViaCookies,
  preserveCookie,
  updateRetry,
} from '../../support/common/support'
import { getTestVariables } from '../../support/common/testcase'

const { prefix, postalCode, productName, productQuantity } = singleProduct

const singleProductEnvs = getTestVariables(prefix)
const { orderIdEnv } = singleProductEnvs

describe(`${prefix} scenarios`, () => {
  loginViaCookies()

  it(`In ${prefix} - Adding Product to Cart`, updateRetry(3), () => {
    // Search the product
    cy.searchProduct(productName)
    // Add product to cart
    cy.addProduct(productName)
  })

  it(
    `In ${prefix} - Updating product quantity to ${productQuantity}`,
    updateRetry(4),
    () => {
      cy.updateProductQuantity(productName, {
        quantity: productQuantity,
        verifySubTotal: false,
      })
    }
  )

  it(`In ${prefix} - Updating Shipping Information`, updateRetry(4), () => {
    // Update Shipping Section
    cy.updateShippingInformation({
      postalCode,
    })
  })

  completePyamentWithDinersCard(prefix, orderIdEnv)

  preserveCookie()
})
