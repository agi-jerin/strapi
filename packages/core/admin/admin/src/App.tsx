/**
 *
 * App.js
 *
 */
import * as React from 'react';
import { Suspense, useEffect } from 'react';

import { Popover, PopoverAnchor, PopoverContent, PopoverPortal } from '@radix-ui/react-popover';
import { Box, Button, Flex } from '@strapi/design-system';
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

// const [GuidedTourProviderImpl, unstableUseGuidedTour] = createContext<{
//   state: State;
//   dispatch: React.Dispatch<Action>;
// }>('GuidedTour');

// const UnstableGuidedTourProvider = ({ children }: { children: React.ReactNode }) => {
//   const [state, dispatch] = React.useReducer(reducer, initialState);

//   const contentManagerStepRefs = React.useRef([
//     React.createRef<HTMLDivElement>(),
//     React.createRef<HTMLDivElement>(),
//     React.createRef<HTMLDivElement>(),
//   ]);

//   const contentTypeBuilderStepRefs = React.useRef([
//     React.createRef<HTMLDivElement>(),
//     React.createRef<HTMLDivElement>(),
//     React.createRef<HTMLDivElement>(),
//   ]);

//   React.useEffect(() => {
//     dispatch({ type: 'init' });
//     console.log('init the tour to set the correct domain');
//   }, []);

//   React.useEffect(() => {
//     dispatch({ type: 'init' });
//     if (state.currentTour === 'content-manager') {
//       console.log('content-manager');
//       dispatch({
//         type: 'start_content_manager_tour',
//         popoverAnchor: contentManagerStepRefs.current[0],
//         stepRefs: contentManagerStepRefs.current,
//         currentStepIndex: 0,
//       });
//     }
//   }, [state.currentTour, state.popoverAnchor]);

//   return (
//     <GuidedTourProviderImpl state={state} dispatch={dispatch}>
//       {children}
//     </GuidedTourProviderImpl>
//   );
// };

// const GuidedTourTooltip = () => {
//   const state = unstableUseGuidedTour('GuidedTourTooltip', (state) => state.state);
//   const dispatch = unstableUseGuidedTour('GuidedTourTooltip', (state) => state.dispatch);

//   return (
//     state.popoverAnchor?.current && (
//       <Popover open>
//         <PopoverAnchor virtualRef={state.popoverAnchor} />
//         <PopoverPortal>
//           <PopoverContent
//             side="top"
//             align="start"
//             className="bg-white border p-2 shadow rounded"
//             style={{ padding: '2rem' }}
//           >
//             <Flex>This is some mock content!</Flex>
//             <Button onClick={() => dispatch({ type: 'next_step' })}>Next</Button>
//           </PopoverContent>
//         </PopoverPortal>
//       </Popover>
//     )
//   );
// };

type Action =
  | {
      type: 'init';
    }
  | {
      type: 'start_tour';
      stepRefs: React.RefObject<HTMLDivElement>[];
      popoverAnchor: React.RefObject<HTMLDivElement>;
      currentStepIndex: number;
    }
  | {
      type: 'next_step';
    }
  | {
      type: 'hide_popover';
    };

type State = {
  currentTour: 'content-type-builder' | 'content-manager';
  stepRefs: React.RefObject<HTMLDivElement>[];
  popoverAnchor: React.RefObject<HTMLDivElement> | null;
  currentStepIndex: number;
};

const initialState: State = {
  currentTour: 'content-type-builder',
  stepRefs: [],
  popoverAnchor: null,
  currentStepIndex: 0,
};

function reducer(state: State, action: Action): State {
  if (action.type === 'init') {
    const mockLocalStorageValue = 'content-manager';

    return {
      ...state,
      currentTour: mockLocalStorageValue,
    };
  }

  if (action.type === 'start_tour') {
    return {
      ...state,
      stepRefs: action.stepRefs,
      popoverAnchor: action.popoverAnchor,
      currentStepIndex: action.currentStepIndex,
    };
  }

  if (action.type === 'next_step') {
    if (state.currentStepIndex === state.stepRefs.length - 1) {
      return {
        ...state,
        popoverAnchor: null,
        currentStepIndex: 0,
      };
    }

    const nextStepIndex = state.currentStepIndex + 1;

    return {
      ...state,
      popoverAnchor: state.stepRefs[nextStepIndex],
      currentStepIndex: nextStepIndex,
    };
  }

  if (action.type === 'hide_popover') {
    return {
      ...state,
      popoverAnchor: null,
    };
  }

  return state;
}

export const UnstableGuidedTour = ({
  children,
  domain,
  initialStep = 0,
  skip = false,
}: {
  children: (state: State) => React.ReactNode;
  domain: 'content-manager' | 'content-type-builder';
  initialStep?: number;
  skip?: boolean;
}) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  // Content Manager Steps
  const contentManagerStepRefs = React.useRef([
    React.useRef<HTMLDivElement>(null),
    React.useRef<HTMLDivElement>(null),
  ]);

  // ContentTypeBuilderSteps
  const contentTypeBuilderStepRefs = React.useRef([
    React.useRef<HTMLDivElement>(null),
    React.useRef<HTMLDivElement>(null),
    React.useRef<HTMLDivElement>(null),
  ]);

  // Do everything
  React.useLayoutEffect(() => {
    if (domain === 'content-manager') {
      dispatch({
        type: 'start_tour',
        popoverAnchor: contentManagerStepRefs.current[initialStep],
        stepRefs: contentManagerStepRefs.current,
        currentStepIndex: initialStep,
      });
    }

    if (domain === 'content-type-builder') {
      console.log('did run for ctb');
      dispatch({
        type: 'start_tour',
        popoverAnchor: contentTypeBuilderStepRefs.current[initialStep],
        stepRefs: contentTypeBuilderStepRefs.current,
        currentStepIndex: initialStep,
      });
    }
  }, [domain, initialStep]);

  const stepContent = {
    'content-manager': [
      {
        title: 'Step 1 cm',
        content: 'Step 1 content',
        next: () => dispatch({ type: 'hide_popover' }),
      },
      {
        title: 'Step 2 cm',
        content: 'Step 2 content',
        next: () => dispatch({ type: 'next_step' }),
      },
    ],
    'content-type-builder': [
      {
        title: 'Step 1 ctb',
        content: 'Step 1 content',
        next: () => dispatch({ type: 'next_step' }),
      },
      {
        title: 'Step 2 ctb',
        content: 'Step 2 content',
        next: () => dispatch({ type: 'next_step' }),
      },
      {
        title: 'Step 3 ctb',
        content: 'Step 3 content',
        next: () => dispatch({ type: 'next_step' }),
      },
    ],
  };

  console.log({ state });

  return (
    <>
      {children(state)}
      {state.popoverAnchor && (
        <Popover open>
          <PopoverAnchor virtualRef={state.popoverAnchor} />
          <PopoverPortal>
            <PopoverContent
              side="top"
              align="start"
              className="bg-white border p-2 shadow rounded"
              style={{
                padding: '2rem',
                backgroundColor: 'yellow',
              }}
            >
              <Flex>{stepContent[domain][state.currentStepIndex].title}</Flex>
              <Flex>{stepContent[domain][state.currentStepIndex].content}</Flex>
              <Button onClick={stepContent[domain][state.currentStepIndex].next}>Next</Button>
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      )}
    </>
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
