export function ApiKeysTableSkeleton() {
    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead>
                    <tr>
                        <th className="w-10">
                            <div className="skeleton h-5 w-5"></div>
                        </th>
                        <th>Label</th>
                        <th>API Key</th>
                        <th>Created</th>
                        <th>Expires</th>
                        <th>Last Used</th>
                    </tr>
                </thead>
                <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i}>
                            <td>
                                <div className="skeleton h-5 w-5"></div>
                            </td>
                            <td>
                                <div className="skeleton h-5 w-[70%]"></div>
                            </td>
                            <td>
                                <div className="skeleton h-5 w-[60%]"></div>
                            </td>
                            <td>
                                <div className="skeleton h-5 w-[65%]"></div>
                            </td>
                            <td>
                                <div className="skeleton h-5 w-[55%]"></div>
                            </td>
                            <td>
                                <div className="skeleton h-5 w-[50%]"></div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
