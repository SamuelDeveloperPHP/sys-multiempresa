import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export default function Dropdown({
    align = 'right',
    width = '48',
    contentClasses = 'py-1 bg-white',
    trigger,
    children,
}) {
    let alignmentClasses = 'origin-top';

    if (align === 'left') {
        alignmentClasses = 'origin-top-left left-0';
    } else if (align === 'right') {
        alignmentClasses = 'origin-top-right right-0';
    }

    let widthClasses = '';

    if (width === '48') {
        widthClasses = 'w-48';
    }

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button as={Fragment}>
                    {trigger}
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items
                    className={`absolute z-50 mt-2 rounded-md shadow-lg ${alignmentClasses} ${widthClasses}`}
                >
                    <div className={`rounded-md ring-1 ring-black ring-opacity-5 ${contentClasses}`}>
                        {children}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
