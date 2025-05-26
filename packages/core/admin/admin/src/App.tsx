/**
 *
 * App.js
 *
 */
import * as React from 'react';
import { Suspense, useEffect } from 'react';

import { Popover, PopoverAnchor, PopoverContent, PopoverPortal } from '@radix-ui/react-popover';
import { Button } from '@strapi/design-system';
import { Outlet } from 'react-router-dom';

import { createContext } from './components/Context';
import { Page } from './components/PageHelpers';
import { Providers } from './components/Providers';
import { LANGUAGE_LOCAL_STORAGE_KEY } from './reducer';

import type { Store } from './core/store/configure';
import type { StrapiApp } from './StrapiApp';

export type Tours = { feature: string; stepCount: number; [key: string]: unknown }[];

type Step = {
  Actions: () => React.ReactNode;
};

type Content = (
  Step: Step,
  { state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }
) => React.ReactNode;

type TourStep<P extends string> = {
  position: P;
  content: Content;
};

function createTour<const T extends ReadonlyArray<TourStep<string>>>(tourName: string, steps: T) {
  type Components = {
    [K in T[number]['position']]: React.ComponentType<{ children: React.ReactNode }>;
  };

  const tour = steps.reduce((acc, step, index) => {
    if (step.position in acc) {
      throw Error('The tour step has already been registered');
    }

    acc[step.position as keyof Components] = ({ children }: { children: React.ReactNode }) => (
      <GuidedTourPopover step={index} content={step.content} feature={tourName as ValidTourName}>
        {children}
      </GuidedTourPopover>
    );

    return acc;
  }, {} as Components);

  return tour;
}

// Define tours first to infer valid tour names
export const tours = {
  contentManager: createTour('contentManager', [
    {
      position: 'ListViewEmpty',
      content: (Step) => (
        <>
          <div>This is step 1</div>
          <Step.Actions />
        </>
      ),
    },
  ]),
} as const;

// Infer valid tour names from the tours object
type ValidTourName = keyof typeof tours;

// Now use ValidTourName in all type definitions
type Action = {
  type: 'next_step';
  payload: ValidTourName;
};

type State = {
  currentSteps: Record<ValidTourName, number>;
  tours: Tours;
};

function reducer(state: State, action: Action): State {
  if (action.type === 'next_step') {
    return {
      ...state,
      currentSteps: {
        ...state.currentSteps,
        [action.payload]: state.currentSteps[action.payload] + 1,
      },
    };
  }
  return state;
}

export const [GuidedTourProviderImpl, unstableUseGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('GuidedTour');

const createStepComponents = (feature: ValidTourName): Step => ({
  Actions: () => {
    const dispatch = unstableUseGuidedTour('GuidedTourPopover', (s) => s.dispatch);
    return <Button onClick={() => dispatch({ type: 'next_step', payload: feature })}>Next!</Button>;
  },
});

export const GuidedTourPopover = ({
  children,
  content,
  step,
  feature,
}: {
  children: React.ReactNode;
  content: Content;
  step: number;
  feature: ValidTourName;
}) => {
  const state = unstableUseGuidedTour('GuidedTourPopover', (s) => s.state);
  const dispatch = unstableUseGuidedTour('GuidedTourProvider', (s) => s.dispatch);
  const isCurrentStep = state.currentSteps[feature] === step;

  // Memoize the object to give access to the feature name to the components
  // without re-creating them on every render
  const Step = React.useMemo(() => createStepComponents(feature), [feature]);
  return (
    <Popover open={isCurrentStep}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverPortal>
        <PopoverContent
          side="top"
          align="center"
          style={{ padding: '2rem', backgroundColor: 'green' }}
        >
          {content(Step, { state, dispatch })}
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
    currentSteps: {
      contentManager: 0,
    } as Record<ValidTourName, number>,
    tours,
  });

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

interface AppProps {
  strapi: StrapiApp;
  store: Store;
}

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
