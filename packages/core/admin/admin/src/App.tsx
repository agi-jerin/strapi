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

type Step = {
  title: string;
  content: string;
  // Do stuff (ie update local storage) then dispatch the next_step action
  next: (state: State, dispatch: React.Dispatch<Action>) => void;
  // Do stuff (ie update local storage) then dispatch the skip_feature action
  // skip: (state: State, dispatch: React.Dispatch<Action>) => void;
};

export type Tours = { feature: string; steps: Step[] }[];

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
  currentStepIndex: number;
  tours: Tours;
};

function reducer(state: State, action: Action): State {
  if (action.type === 'next_step') {
    const nextStepIndex = state.currentStepIndex + 1;

    return {
      ...state,
      currentStepIndex: nextStepIndex,
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
  stepIndex,
  feature,
}: {
  children: React.ReactNode;
  stepIndex: number;
  feature: string;
}) => {
  const state = unstableUseGuidedTour('GuidedTourPopover', (s) => s.state);
  const dispatch = unstableUseGuidedTour('GuidedTourPopover', (s) => s.dispatch);
  // Derived from steps, the next tour will be the first item in the array,
  // Each time a tour is completed it is removed from the array
  const mockLocalStorageTours = state.tours.map((tour) => tour.feature);
  console.log(mockLocalStorageTours);
  // All tours have been completed
  if (!mockLocalStorageTours.length) {
    return children;
  }

  // If the feature is not in the list, skip it
  if (!mockLocalStorageTours.includes(feature)) {
    return children;
  }

  // The tour should display in order
  // Confirm the next tour is the current tour
  const nextTour = state.tours[1];
  if (nextTour.feature !== feature) {
    return children;
  }

  const stepContent = nextTour.steps[stepIndex];
  const isCurrentStep = state.currentStepIndex === stepIndex;

  return (
    <Popover open={isCurrentStep}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverPortal>
        <PopoverContent
          side="top"
          align="start"
          className="bg-white border p-2 shadow rounded"
          style={{ padding: '2rem', backgroundColor: 'yellow' }}
        >
          <Flex>{stepContent?.title}</Flex>
          <Flex>{stepContent?.content}</Flex>
          <Button onClick={() => stepContent?.next(state, dispatch)}>Next</Button>
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
    currentStepIndex: 0,
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
