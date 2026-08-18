import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { PublicRouteGuard } from '../components/common/PublicRouteGuard';
import {
  HomePage,
  PillarsPage,
  AuthPage,
  DashboardPage,
  IntelligencePage,
  RiskMapPage,
  EmergencyPage,
  ReliefPage,
  FarmerPage,
  NotFoundPage,
  MyFarmPage,
  MyCropsPage,
  CropStagePage,
  FarmWeatherPage,
  RainfallImpactPage,
  FarmAlertsPage,
  IrrigationWatchPage,
  SeasonalInsightsPage,
  FarmHistoryPage,
  MyFieldsPage,
  FarmerAiPage,
  FarmerOnboardingPage,
  FarmerProfileEditorPage,
} from '../pages';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        {/* Public Exploration & Entry Routes (Guarded: Redirects to Dashboard/Farmer when logged in) */}
        <Route
          index
          element={
            <PublicRouteGuard>
              <HomePage />
            </PublicRouteGuard>
          }
        />
        <Route path="pillars" element={<PillarsPage />} />

        {/* Public Authentication Channels (Guarded: Redirects to Dashboard/Farmer when logged in) */}
        <Route
          path="auth"
          element={
            <PublicRouteGuard>
              <AuthPage />
            </PublicRouteGuard>
          }
        />
        <Route
          path="login"
          element={
            <PublicRouteGuard>
              <AuthPage />
            </PublicRouteGuard>
          }
        />
        <Route
          path="register"
          element={
            <PublicRouteGuard>
              <AuthPage />
            </PublicRouteGuard>
          }
        />
        <Route
          path="register/user"
          element={
            <PublicRouteGuard>
              <AuthPage />
            </PublicRouteGuard>
          }
        />
        <Route
          path="register/farmer"
          element={
            <PublicRouteGuard>
              <AuthPage />
            </PublicRouteGuard>
          }
        />

        {/* Protected Five Pillars & Application Routes */}
        <Route
          path="intelligence"
          element={
            <ProtectedRoute>
              <IntelligencePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="risk-map"
          element={
            <ProtectedRoute>
              <RiskMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="emergency"
          element={
            <ProtectedRoute>
              <EmergencyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="relief"
          element={
            <ProtectedRoute>
              <ReliefPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Authenticated Routes */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Farmer Pillar & Dedicated Agricultural Command Routes */}
        <Route
          path="farmer"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/setup"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerOnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/profile/edit"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerProfileEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/farm"
          element={
            <ProtectedRoute requiredRole="farmer">
              <MyFarmPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/crops"
          element={
            <ProtectedRoute requiredRole="farmer">
              <MyCropsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/crop-stage"
          element={
            <ProtectedRoute requiredRole="farmer">
              <CropStagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/weather"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmWeatherPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/rainfall-impact"
          element={
            <ProtectedRoute requiredRole="farmer">
              <RainfallImpactPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/alerts"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmAlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/irrigation"
          element={
            <ProtectedRoute requiredRole="farmer">
              <IrrigationWatchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/seasonal"
          element={
            <ProtectedRoute requiredRole="farmer">
              <SeasonalInsightsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/history"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/fields"
          element={
            <ProtectedRoute requiredRole="farmer">
              <MyFieldsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/ai"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerAiPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/intelligence"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerAiPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/profile"
          element={
            <ProtectedRoute requiredRole="farmer">
              <MyFarmPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
