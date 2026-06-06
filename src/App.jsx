import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import ThemeToggle from './components/ThemeToggle';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';

import LoginPage from './pages/LoginPage';
import Reports from './pages/Reports';
import ResetPassword from './pages/ResetPassword';
import SignupPage from './pages/SignupPage';
import UserManagement from './pages/UserManagement';
import ChangePassword from './pages/ChangePassword';

import RawMaterials from './pages/RawMaterials';
import ProductionReporting from './pages/ProductionReporting';
import CountryManagement from './pages/CountryManagement';
import CityManagement from './pages/CityManagement';
import ProductCategory from './pages/ProductCategory';
import ProductManagement from './pages/ProductManagement';
import RecipeManagement from './pages/RecipeManagement';
import RawMaterialCategory from './pages/RawMaterialCategory';
import RawMaterialItem from './pages/RawMaterialItem';
import WarehouseLocation from './pages/WarehouseLocation';
import CustomerManagement from './pages/CustomerManagement';
import SalesRepOrderRequest from './pages/SalesRepOrderRequest';
import SalesRepOrderApproval from './pages/SalesRepOrderApproval';
import SalesRepSettlements from './pages/SalesRepSettlements';
import SupplierManagement from './pages/SupplierManagement';
import TaxManagement from './pages/TaxManagement';
import GRNManagement from './pages/GRNManagement';
import VehicleManagement from './pages/VehicleManagement';
import AreaRouteManagement from './pages/AreaRouteManagement';
import SalesRepManagement from './pages/SalesRepManagement';
import OrderManagement from './pages/OrderManagement';
import OrderCrossCheck from './pages/OrderCrossCheck';
import POSPage from './pages/POSPage';

const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ThemeToggle />
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ResetPassword />} />
              <Route
                path="/maintain/customers"
                element={
                  <ProtectedLayout>
                    <CustomerManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/inventory/sales-rep-requests"
                element={
                  <ProtectedLayout>
                    <SalesRepOrderRequest />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/inventory/sales-rep-distribute"
                element={
                  <ProtectedLayout>
                    <SalesRepOrderApproval />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/inventory/sales-rep-settlements"
                element={
                  <ProtectedLayout>
                    <SalesRepSettlements />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedLayout>
                    <Dashboard />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedLayout>
                    <UserManagement />
                  </ProtectedLayout>
                }
              />
            
              <Route
                path="/reports"
                element={
                  <ProtectedLayout>
                    <Reports />
                  </ProtectedLayout>
                }
              />
             
             
              <Route
                path="/raw-materials"
                element={
                  <ProtectedLayout>
                    <RawMaterials />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/production"
                element={
                  <ProtectedLayout>
                    <ProductionReporting />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/maintain/country"
                element={
                  <ProtectedLayout>
                    <CountryManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/maintain/country-city"
                element={
                  <ProtectedLayout>
                    <CityManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/maintain/tax"
                element={
                  <ProtectedLayout>
                    <TaxManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/product/category"
                element={
                  <ProtectedLayout>
                    <ProductCategory />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/product/items"
                element={
                  <ProtectedLayout>
                    <ProductManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/product/recipe"
                element={
                  <ProtectedLayout>
                    <RecipeManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/raw-material/category"
                element={
                  <ProtectedLayout>
                    <RawMaterialCategory />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/raw-material/items"
                element={
                  <ProtectedLayout>
                    <RawMaterialItem />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/warehouse/location"
                element={
                  <ProtectedLayout>
                    <WarehouseLocation />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <ProtectedLayout>
                    <SupplierManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/inventory/grn"
                element={
                  <ProtectedLayout>
                    <GRNManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/inventory/orders"
                element={
                  <ProtectedLayout>
                    <OrderManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/inventory/order-cross-check"
                element={
                  <ProtectedLayout>
                    <OrderCrossCheck />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedLayout>
                    <POSPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/maintain/vehicles"
                element={
                  <ProtectedLayout>
                    <VehicleManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/maintain/area-route"
                element={
                  <ProtectedLayout>
                    <AreaRouteManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/maintain/sales-rep"
                element={
                  <ProtectedLayout>
                    <SalesRepManagement />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/change-password"
                element={
                  <ProtectedLayout>
                    <ChangePassword />
                  </ProtectedLayout>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
