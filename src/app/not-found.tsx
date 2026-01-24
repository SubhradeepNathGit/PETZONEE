'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <h2 className="text-4xl font-bold mb-4">404 - Not Found</h2>
            <p className="text-gray-600 mb-8">Could not find requested resource</p>
            <Link
                href="/"
                className="px-6 py-3 bg-[#FF8A65] text-white rounded-full font-semibold hover:bg-[#FF6B40] transition-colors"
            >
                Return Home
            </Link>
        </div>
    );
}
