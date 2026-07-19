import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "birdsong-ui";

export function ResponsesList() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Lead score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Alex Rivera</TableCell>
          <TableCell>alex@copperpoint.example</TableCell>
          <TableCell>
            <Badge variant="primary">8</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jordan Lee</TableCell>
          <TableCell>jordan@gablefrost.example</TableCell>
          <TableCell>
            <Badge variant="default">5</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
