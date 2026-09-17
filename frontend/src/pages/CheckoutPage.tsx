import React, { useState } from 'react'
import { useHistory, useLocation, useParams } from 'react-router-dom'
import { ApolloError, useMutation, useQuery } from '@apollo/client'
import { Loader2 } from 'lucide-react'
import { CHECKOUT } from '../graphql/mutations'
import { GET_ORDER } from '../graphql/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OrderItem {
  product: { id: string; title: string }
  amount: number
  price: number
}

interface CheckoutForm {
  firstName: string
  lastName: string
  emailAddress: string
  deliveryAddress: string
  paymentMethod: string
  cardNumber: string
  cardHolder: string
  expiryDate: string
  cvv: string
}

type FieldName = keyof CheckoutForm
type FormErrors = Partial<Record<FieldName, string>>

interface TextField {
  name: Exclude<FieldName, 'paymentMethod'>
  type: string
  autoComplete: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  placeholder?: string
  maxLength?: number
}

const PAYMENT_METHODS = ['Visa', 'MasterCard']

const CONTACT_FIELDS: TextField[] = [
  { name: 'firstName', type: 'text', autoComplete: 'given-name' },
  { name: 'lastName', type: 'text', autoComplete: 'family-name' },
  { name: 'emailAddress', type: 'email', autoComplete: 'email' },
  { name: 'deliveryAddress', type: 'text', autoComplete: 'street-address' },
]

const CARD_FIELDS: TextField[] = [
  { name: 'cardNumber', type: 'text', autoComplete: 'cc-number', inputMode: 'numeric', placeholder: '1234 5678 9012 3456', maxLength: 19 },
  { name: 'cardHolder', type: 'text', autoComplete: 'cc-name' },
  { name: 'expiryDate', type: 'text', autoComplete: 'cc-exp', placeholder: 'MM/YY', maxLength: 5 },
  { name: 'cvv', type: 'password', autoComplete: 'cc-csc', inputMode: 'numeric', maxLength: 3 },
]

const LABELS: Record<FieldName, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  emailAddress: 'Email address',
  deliveryAddress: 'Delivery address',
  paymentMethod: 'Payment method',
  cardNumber: 'Card number',
  cardHolder: 'Card holder',
  expiryDate: 'Expiry date',
  cvv: 'CVV',
}

const emptyForm: CheckoutForm = {
  firstName: '',
  lastName: '',
  emailAddress: '',
  deliveryAddress: '',
  paymentMethod: '',
  cardNumber: '',
  cardHolder: '',
  expiryDate: '',
  cvv: '',
}

const AUTH_ERROR = 'Authentication required'

const digitsOnly = (value: string) => value.replace(/\s+/g, '')

// Expiry is MM/YY; the card stays valid until the end of that month
const isExpired = (expiryDate: string) => {
  const [month, year] = expiryDate.split('/').map(Number)
  return new Date() >= new Date(2000 + year, month, 1)
}

const trimForm = (form: CheckoutForm): CheckoutForm =>
  Object.fromEntries(
    (Object.keys(form) as FieldName[]).map(key => [key, form[key].trim()])
  ) as Record<FieldName, string>

const validateForm = (form: CheckoutForm): FormErrors => {
  const errors: FormErrors = {}

  for (const key of Object.keys(LABELS) as FieldName[]) {
    if (!form[key]) {
      errors[key] = `${LABELS[key]} is required`
    }
  }

  if (!errors.cardNumber && !/^\d{16}$/.test(digitsOnly(form.cardNumber))) {
    errors.cardNumber = 'Card number must be 16 digits'
  }
  if (!errors.expiryDate) {
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiryDate)) {
      errors.expiryDate = 'Expiry date must be in MM/YY format'
    } else if (isExpired(form.expiryDate)) {
      errors.expiryDate = 'Card has expired'
    }
  }
  if (!errors.cvv && !/^\d{3}$/.test(form.cvv)) {
    errors.cvv = 'CVV must be 3 digits'
  }

  return errors
}

const CheckoutPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const location = useLocation<{ products?: OrderItem[] } | undefined>()
  const history = useHistory()
  const [form, setForm] = useState<CheckoutForm>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')

  const stateProducts = location.state?.products

  const redirectOnAuthError = (error: ApolloError) => {
    if (error.graphQLErrors.some(e => e.message === AUTH_ERROR)) {
      localStorage.removeItem('auth_token')
      history.push('/login')
      return true
    }
    return false
  }

  const { loading: orderLoading, error: orderError, data: orderData } = useQuery(GET_ORDER, {
    variables: { orderId },
    skip: !!stateProducts,
    onError: redirectOnAuthError,
  })

  const items: OrderItem[] = stateProducts ?? orderData?.order?.products ?? []
  const total = Math.round(items.reduce((sum, item) => sum + item.amount * item.price, 0) * 100) / 100

  const [checkout, { loading }] = useMutation(CHECKOUT, {
    update: (cache) => {
      // Order status changed server-side; force /order to refetch
      cache.evict({ fieldName: 'orders' })
      cache.gc()
    },
    onCompleted: () => {
      history.push('/results', { orderId })
    },
    onError: (error) => {
      if (!redirectOnAuthError(error)) {
        setSubmitError(error.message || 'Payment failed. Please try again.')
      }
    },
  })

  const handleChange = (name: FieldName, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    const trimmed = trimForm(form)
    const nextErrors = validateForm(trimmed)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      await checkout({
        variables: {
          input: {
            id: orderId,
            firstName: trimmed.firstName,
            lastName: trimmed.lastName,
            emailAddress: trimmed.emailAddress,
            deliveryAddress: trimmed.deliveryAddress,
            paymentMethod: trimmed.paymentMethod,
            payment: {
              cardNumber: digitsOnly(trimmed.cardNumber),
              cardHolder: trimmed.cardHolder,
              expiryDate: trimmed.expiryDate,
              cvv: trimmed.cvv,
            },
            order: {
              products: items.map(({ product, amount, price }) => ({ id: product.id, amount, price })),
              total,
            },
          },
        },
      })
    } catch (err) {
      // Error is handled by onError callback
    }
  }

  const renderField = ({ name, ...inputProps }: TextField) => (
    <div key={name} className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">{LABELS[name]}</label>
      <Input
        id={name}
        {...inputProps}
        value={form[name]}
        onChange={(e) => handleChange(name, e.target.value)}
        disabled={loading}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        className="h-11"
      />
      {errors[name] && (
        <p id={`${name}-error`} className="text-sm text-red-600">{errors[name]}</p>
      )}
    </div>
  )

  if (orderLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    )
  }

  if (orderError || items.length === 0) {
    return (
      <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p className="text-sm font-medium">
          {orderError ? orderError.message : 'This order has no products to checkout.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-full py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-center text-2xl font-semibold text-gray-900">
            Checkout order #{orderId}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {CONTACT_FIELDS.map(renderField)}

            <div className="space-y-2">
              <label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">{LABELS.paymentMethod}</label>
              <select
                id="paymentMethod"
                value={form.paymentMethod}
                onChange={(e) => handleChange('paymentMethod', e.target.value)}
                disabled={loading}
                aria-invalid={!!errors.paymentMethod}
                aria-describedby={errors.paymentMethod ? 'paymentMethod-error' : undefined}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select payment method</option>
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
              {errors.paymentMethod && (
                <p id="paymentMethod-error" className="text-sm text-red-600">{errors.paymentMethod}</p>
              )}
            </div>

            <fieldset className="space-y-5 border-t border-gray-200 pt-5">
              <legend className="text-base font-semibold text-gray-900">Payment details</legend>
              {CARD_FIELDS.map(renderField)}
            </fieldset>

            <div className="flex items-center justify-between border-t border-gray-200 pt-5">
              <span className="text-base font-medium text-gray-700">Order total</span>
              <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
            </div>

            {submitError && (
              <div role="alert" className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Checkout'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CheckoutPage
