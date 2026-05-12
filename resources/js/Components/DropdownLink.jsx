import { Link } from '@inertiajs/react';
import { Menu } from '@headlessui/react';

export default function DropdownLink({ className = '', children, ...props }) {
    return (
        <Menu.Item>
            {({ active }) => (
                <Link
                    {...props}
                    className={
                        `block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 transition duration-150 ease-in-out focus:outline-none ${
                            active ? 'bg-gray-100' : ''
                        } ` + className
                    }
                >
                    {children}
                </Link>
            )}
        </Menu.Item>
    );
}
