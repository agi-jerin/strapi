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

type TourStep<P extends string> = {
  position: P;
  content: (state: State, dispatch: React.Dispatch<Action>) => React.ReactNode;
};

function createTour<const T extends ReadonlyArray<TourStep<string>>>(
  steps: T
): {
  [K in T[number]['position']]: React.FC<{ children: React.ReactNode }>;
} {
  const tour: {
    [position: string]: React.FC<{ children: React.ReactNode }>;
  } = {};

  steps.forEach((step, index) => {
    if (Object.keys(tour).includes(step.position)) {
      throw Error('The tour step has already been registered');
    }

    tour[step.position] = ({ children }: { children: React.ReactNode }) => (
      <GuidedTourPopover step={index + 1} render={step.content}>
        {children}
      </GuidedTourPopover>
    );
  });

  return tour as { [K in T[number]['position']]: React.FC<{ children: React.ReactNode }> };
}

export const tours = {
  contentManager: createTour([
    {
      // this be the step id instead of using a number
      // auto format/enforce pascal case?
      position: 'ListViewEmpty',
      content: (_, dispatch) => (
        <>
          <div>This is step 1</div>
          <Button onClick={() => dispatch({ type: 'next_step' })}>Next!</Button>
        </>
      ),
    },
    {
      // this be the step id instead of using a number
      // auto format/enforce pascal case?
      position: 'EditViewPageIntro',
      content: (_, dispatch) => (
        <>
          <div>This is step 2</div>
          <Button onClick={() => dispatch({ type: 'next_step' })}>Next!</Button>
        </>
      ),
    },
  ]),
};

export const GuidedTourPopover = ({
  children,
  render,
  step,
}: {
  children: React.ReactNode;
  render: (state: State, dispatch: React.Dispatch<Action>) => React.ReactNode;
  step: number;
}) => {
  const state = unstableUseGuidedTour('GuidedTourPopover', (s) => s.state);
  const dispatch = unstableUseGuidedTour('GuidedTourPopover', (s) => s.dispatch);
  // Derived from tours, the next tour will be the first item in the array,
  // Each time a tour is completed it is removed from the array
  const mockLocalStorageTours = state.tours.map((tour) => tour.feature);

  // All tours have been completed
  if (!mockLocalStorageTours.length) {
    return children;
  }

  const isCurrentStep = state.currentStep === step;

  return (
    <Popover open={isCurrentStep}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverPortal>
        <PopoverContent
          side="top"
          align="center"
          style={{ padding: '2rem', backgroundColor: 'green' }}
        >
          {render(state, dispatch)}
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
