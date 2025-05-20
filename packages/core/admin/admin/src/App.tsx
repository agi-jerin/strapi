/**
 *
 * App.js
 *
 */
import * as React from 'react';
import { Suspense, useEffect } from 'react';

import { Popover, PopoverAnchor, PopoverContent, PopoverPortal } from '@radix-ui/react-popover';
import { Box, Button, Flex, Popover as StrapiPopover } from '@strapi/design-system';
import { Outlet } from 'react-router-dom';

import { createContext } from './components/Context';
import { Page } from './components/PageHelpers';
import { Providers } from './components/Providers';
import { LANGUAGE_LOCAL_STORAGE_KEY } from './reducer';

import type { Store } from './core/store/configure';
import type { StrapiApp } from './StrapiApp';

interface AppProps {
  strapi: StrapiApp;
  store: Store;
}

export type Tours = { feature: string; stepCount: number; [key: string]: unknown }[];

type Action =
  | {
      type: 'init';
    }
  | {
      type: 'start_tour';
    }
  | {
      type: 'next_step';
    };

type State = {
  currentStep: number;
  tours: Tours;
};

function reducer(state: State, action: Action): State {
  if (action.type === 'next_step') {
    const nextStep = state.currentStep + 1;

    return {
      ...state,
      currentStep: nextStep,
    };
  }

  return state;
}

export const [GuidedTourProviderImpl, unstableUseGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('GuidedTour');

export const GuidedTourPopover = ({
  children,
  render,
  step,
  skip,
  feature,
}: {
  children: React.ReactNode;
  render: React.ReactNode;
  step: number;
  skip: boolean;
  feature: string;
}) => {
  const state = unstableUseGuidedTour('GuidedTourPopover', (s) => s.state);
  // Derived from tours, the next tour will be the first item in the array,
  // Each time a tour is completed it is removed from the array
  const mockLocalStorageTours = state.tours.map((tour) => tour.feature);

  // All tours have been completed
  if (!mockLocalStorageTours.length) {
    return children;
  }

  // If the feature is not in the list, skip it
  if (!mockLocalStorageTours.includes(feature)) {
    return children;
  }

  const isCurrentStep = state.currentStep === step;

  return (
    <Popover open={isCurrentStep}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverPortal>
        <PopoverContent
          side="top"
          align="start"
          style={{ padding: '2rem', backgroundColor: 'yellow' }}
        >
          {render}
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export const UnstableGuidedTourProvider = ({
  children,
  tours,
}: {
  children: React.ReactNode;
  tours: Tours;
}) => {
  const [state, dispatch] = React.useReducer(reducer, {
    currentStep: 1,
    tours,
  });

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

const App = ({ strapi, store }: AppProps) => {
  useEffect(() => {
    const language = localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY) || 'en';

    if (language) {
      document.documentElement.lang = language;
    }
  }, []);

  return (
    <Providers strapi={strapi} store={store}>
      <Suspense fallback={<Page.Loading />}>
        <Outlet />
      </Suspense>
    </Providers>
  );
};

export { App };
export type { AppProps };
