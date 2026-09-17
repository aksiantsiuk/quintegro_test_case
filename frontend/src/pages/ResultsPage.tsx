import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const ResultsPage: React.FC = () => {
  const location = useLocation<{ orderId?: string } | undefined>()
  const orderId = location.state?.orderId

  return (
    <div className="flex justify-center items-center min-h-full py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Payment successful</h1>
          <p className="mt-2 text-gray-600">
            {orderId ? `Your order #${orderId} has been placed.` : 'Your order has been placed.'}
          </p>
          <Link to="/order" className="mt-6 inline-block text-blue-600 hover:underline">
            Back to orders
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default ResultsPage
