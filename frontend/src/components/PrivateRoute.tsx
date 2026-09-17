import React from 'react'
import { Redirect, Route, RouteProps } from 'react-router-dom'

interface PrivateRouteProps extends Omit<RouteProps, 'render' | 'children'> {
  component: React.ComponentType
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ component: Component, ...rest }) => (
  <Route
    {...rest}
    render={() =>
      localStorage.getItem('auth_token') ? <Component /> : <Redirect to="/login" />
    }
  />
)

export default PrivateRoute
